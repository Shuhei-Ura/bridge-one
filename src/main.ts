// main.ts
const express = require('express'); // CJSでOK
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as path from 'path';
import { getUploadsRoot } from './config/uploads';
import helmet from 'helmet';
const cookieParser = require('cookie-parser');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const methodOverride = require('method-override');
const csurf = require('csurf');
import { ValidationPipe } from '@nestjs/common';

// ★ メモリストレージの multer（multipart → body を作るので csurf より前！）
const multer = require('multer');
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024, // 1ファイル 20MB
    files: 5,                    // 1リクエスト最大5ファイル
  },
});

const viewsRoot = path.join(process.cwd(), 'src', 'views');
const exphbs: any = require('express-handlebars');

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // 代理プロキシ配下(本番)で secure cookie を使う場合
  app.set('trust proxy', 1);

  // セキュリティ（必要なら CSP 調整）
  app.use(helmet());

  // クッキー
  app.use(cookieParser());

  // ★ multipart パーサ（multer）: csurf より前に！
  //   ここで req.files / req.body が作られる
  app.use(upload.any());

  // 本文パーサ（urlencoded/json）: これも csurf より前に！
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());

  // --- MySQL セッションストア ---
  const sessionStore = new MySQLStore({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'bridge_one',
    clearExpired: true,
    checkExpirationInterval: 15 * 60 * 1000, // 15分おき
    expiration: 7 * 24 * 60 * 60 * 1000,     // 7日
    schema: { tableName: 'sessions' },       // 自動作成
  });

  app.use(
    session({
      name: 'bridgeone.sid',
      secret: process.env.SESSION_SECRET || 'change-me',
      store: sessionStore,
      resave: false,
      saveUninitialized: false,
      proxy: true, // trust proxy とセットで
      cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production', // 本番は true（HTTPS）
        maxAge: 8 * 60 * 60 * 1000, // 8h
      },
    }),
  );

  // HTML フォームで PATCH/DELETE を使うため
  app.use(methodOverride('_method'));

  // CSRF（セッション後に適用）
  app.use(csurf());
  app.use((req: any, res: any, next: any) => {
    try {
      res.locals.csrfToken = req.csrfToken?.();
    } catch {}
    next();
  });

  // CSRF エラーの簡易ハンドラ
  app.use((err: any, _req: any, res: any, next: any) => {
    if (err && err.code === 'EBADCSRFTOKEN') {
      return res.status(403).send('Invalid CSRF token');
    }
    next(err);
  });

  // DTOバリデーション
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // 静的ファイル（/public と /uploads）
  const pubRoot = path.join(process.cwd(), 'public');
  const uploadsAbs = getUploadsRoot(); // 物理: <project>/public/uploads
  app.use('/css', express.static(path.join(pubRoot, 'css')));
  app.use('/js', express.static(path.join(pubRoot, 'js')));
  app.use('/img', express.static(path.join(pubRoot, 'img')));

  // /uploads → 物理 public/uploads を公開
  app.use('/uploads', express.static(uploadsAbs));
  // 既存のパスを温存したい場合（/public/... が必要なら）
  app.use('/public', express.static(pubRoot));

  // Viewエンジン（.handlebars）
  app.engine(
    'handlebars',
    exphbs.engine({
      extname: '.handlebars',
      defaultLayout: 'main',
      layoutsDir: path.join(viewsRoot, 'layouts'),
      partialsDir: path.join(viewsRoot, 'partials'),
      helpers: {
        eq: (a: any, b: any) => String(a) === String(b),
        ne: (a: any, b: any) => String(a) !== String(b),

        and: (...values: any[]) => values.slice(0, -1).every(Boolean),
        or: (...values: any[]) => values.slice(0, -1).some(Boolean),

        section(name: string, options: any) {
          if (!this._sections) this._sections = {};
          this._sections[name] = options.fn(this);
          return null;
        },

        inc: (v: any) => Number(v) + 1,
        dec: (v: any) => Number(v) - 1,
        gt: (a: any, b: any) => Number(a) > Number(b),

        selected: (a: any, b: any) =>
          String(a) === String(b) ? 'selected' : '',
        checked: (v: any) =>
          v === true || v === '1' || v === 1 || v === 'on' ? 'checked' : '',

        querystring: (q: Record<string, any>, key: string, value: any) => {
          const params = new URLSearchParams();
          for (const k in q) {
            if (q[k] != null && q[k] !== '' && k !== 'page') {
              params.append(k, q[k]);
            }
          }
          params.set(key, String(value));
          return params.toString();
        },

        ifeq: function (a: any, b: any, options: any) {
          return String(a) === String(b) ? options.fn(this) : options.inverse(this);
        },
        // ▼ ここから追加 ▼
        range: (start: any, end: any) => {
          start = Number(start);
          end = Number(end);
          const arr: number[] = [];   // ← 型を指定！
          for (let i = start; i <= end; i++) arr.push(i);
          return arr;
        },

        lte: (a: any, b: any) => Number(a) <= Number(b),
        gte: (a: any, b: any) => Number(a) >= Number(b),

        workStyleLabel: (lvl: any) => {
          const n = Number(lvl);
          switch (n) {
            case 1: return 'フルリモートのみ';
            case 2: return 'ハイブリッド';
            case 3: return '常駐';
            default: return '—';
          }
        },
        nl2br: (text: any) => {
          if (!text) return '';
          return String(text).replace(/\r?\n/g, '<br>');
        },

        formatDate: (value: any, preset: 'date'|'time'|'datetime' = 'datetime', tz = 'Asia/Tokyo') => {
          if (!value) return '';
          const d = new Date(String(value));
          if (isNaN(d.getTime())) return String(value); // 変換できなければ素の値

          const optMap: Record<string, Intl.DateTimeFormatOptions> = {
            date:     { year: 'numeric', month: '2-digit', day: '2-digit' },
            time:     { hour: '2-digit', minute: '2-digit' },
            datetime: { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' },
          };

          // 例: "2025/11/11 21:05"（カンマ除去）
          const s = new Intl.DateTimeFormat('ja-JP', { ...optMap[preset], timeZone: tz }).format(d);
          return s.replace(',', '');
        },    
        // ステータス日本語ラベル
        statusLabel: (status: any) => {
          switch (String(status)) {
            case 'pending':  return '承認待ち';   // ← ここを「送信済み（返信待ち）」から変更
            case 'accepted': return '承諾済み';
            case 'declined': return '辞退';
            case 'expired':  return '取り下げ';
            default:         return '—';
          }
        }, 
      },
    }),
  );
  app.setViewEngine('handlebars');
  app.setBaseViewsDir(viewsRoot);

  // 共通locals注入
  app.use((req: any, res: any, next: any) => {
    res.locals.currentUser = req.session?.user || null;
    res.locals.companyId = req.session?.user?.company_id || null;
    res.locals.msg = req.query?.msg || null;
    res.locals.warn = req.query?.warn || null;
    res.locals.err = req.query?.err || null;
    next();
  });

  await app.listen(process.env.PORT || 3001);
}
bootstrap();
