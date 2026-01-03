// src/storage/storage.service.ts
import { Injectable } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';
import { execFile } from 'child_process';
import { access } from 'fs/promises';

import {
  ensureSubdir,
  uploadsPublicBase,
  getUploadsRoot,
} from '../config/uploads';

function safeName(name: string) {
  // ファイル名の安全化（OS依存の禁止文字やパス区切りを除去）
  return name.replace(/[^\w.\-]/g, '_');
}

function exists(p?: string | null) {
  return !!p && fs.existsSync(p);
}

/** LibreOffice (soffice) の実行パスを解決 */
function resolveSofficePath(): string {
  // 1) 環境変数優先
  const envPath = process.env.SOFFICE_PATH || process.env.LIBREOFFICE_PATH;
  if (exists(envPath)) return envPath!;

  // 2) 代表的なインストール場所を総当り
  const candidates: string[] = [];
  if (process.platform === 'win32') {
    candidates.push(
      'C:\\Program Files\\LibreOffice\\program\\soffice.exe',
      'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe',
      // .exe が見つからない・権限で弾かれる場合があるので .com も試す
      'C:\\Program Files\\LibreOffice\\program\\soffice.com',
      'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.com',
    );
  } else {
    candidates.push(
      '/usr/bin/soffice',
      '/usr/local/bin/soffice',
      '/Applications/LibreOffice.app/Contents/MacOS/soffice',
    );
  }
  const hit = candidates.find(exists);
  if (hit) return hit;

  // 3) 最後の手段：名前だけ（PATH 依存）
  return process.platform === 'win32' ? 'soffice.exe' : 'soffice';
}

@Injectable()
export class StorageService {
  private readonly uploadsRoot: string;
  private readonly sofficePath: string;

  constructor() {
    // ルートは config 側の実装に統一（= <project>/public/uploads）
    this.uploadsRoot = getUploadsRoot();
    if (!fs.existsSync(this.uploadsRoot)) {
      fs.mkdirSync(this.uploadsRoot, { recursive: true });
    }

    this.sofficePath = resolveSofficePath();
    // 必要ならログで確認（デバッグ時のみ有効化）
    // console.log('[SOFFICE_PATH resolved]', this.sofficePath);
  }

  /** /public/uploads の絶対パスを返す（静的配信ルート） */
  getUploadsRoot(): string {
    return this.uploadsRoot;
  }

  /**
   * バッファ保存 + 公開URL返却
   * @param subdir 'talents' など
   * @returns { url: '/uploads/<subdir>/<filename>', filename, absPath }
   */
  saveToUploads(subdir: string, buf: Buffer, originalName: string) {
    const dir = ensureSubdir(subdir); // 例: <project>/public/uploads/talents
    const base = `${Date.now()}_${safeName(originalName)}`;
    const abs = path.join(dir, base);

    fs.writeFileSync(abs, buf);

    const url = `${uploadsPublicBase()}/${subdir}/${base}`;
    return { url, filename: base, absPath: abs };
  }

  /**
   * Office系 → PDF 変換
   * - LibreOffice (soffice) 必須
   * - 第2引数は「サブディレクトリ名」または「絶対パス」を許容
   *
   * @param inputFilePath 変換元の絶対パス（例: <project>/public/uploads/talents/abc.xlsx）
   * @param outDirOrSubdir 'talents' または 絶対パス
   * @returns 公開URL（例: /uploads/talents/abc.pdf）
   */
  async convertOfficeToPdf(
    inputFilePath: string,
    outDirOrSubdir: string = 'talents',
  ): Promise<string> {
    const outputDir = path.isAbsolute(outDirOrSubdir)
      ? outDirOrSubdir
      : ensureSubdir(outDirOrSubdir);

    // 実行ファイルの存在チェック（名前だけの場合は exists できないが、そのまま execFile に渡す）
    if (path.isAbsolute(this.sofficePath) && !exists(this.sofficePath)) {
      throw new Error(
        `LibreOffice (soffice) not found at ${this.sofficePath}. ` +
        `Set SOFFICE_PATH in .env if needed.`
      );
    }

    await new Promise((resolve, reject) => {
      execFile(
        this.sofficePath,
        ['--headless', '--convert-to', 'pdf', '--outdir', outputDir, inputFilePath],
        (err) => (err ? reject(err) : resolve(null)),
      );
    });

    const base = path.basename(inputFilePath).replace(/\.[^.]+$/, '');
    const pdfAbs = path.join(outputDir, `${base}.pdf`);

    await access(pdfAbs); // 出力確認

    const subdir = path.isAbsolute(outDirOrSubdir)
      ? path.basename(outputDir)
      : outDirOrSubdir;

    return `${uploadsPublicBase()}/${subdir}/${path.basename(pdfAbs)}`;
  }

  /** /uploads のURL or 絶対パスを受けて、存在すれば削除 */
  async deleteIfLocal(maybeUrlOrAbs?: string | null) {
    if (!maybeUrlOrAbs) return;
    try {
      let abs = maybeUrlOrAbs;
      if (abs.startsWith(uploadsPublicBase())) {
        const rel = abs.replace(uploadsPublicBase(), '').replace(/^\/+/, '');
        abs = path.join(this.uploadsRoot, rel); // <public/uploads>/<rel>
      }
      if (path.isAbsolute(abs) && fs.existsSync(abs)) {
        fs.unlinkSync(abs);
      }
    } catch {
      // 失敗しても致命的ではないため握りつぶす（必要ならここでログ）
    }
  }
}

