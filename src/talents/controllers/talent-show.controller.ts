import { Controller, Get, Param, Render, UseGuards, NotFoundException, Req } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Talent } from '../talent.entity';
import { AuthGuard } from '../../auth/auth.guard';

@UseGuards(AuthGuard) // ログイン必須（ロール制限なし）
@Controller('talents')
export class TalentShowController {
  constructor(
    @InjectRepository(Talent)
    private readonly repo: Repository<Talent>,
  ) {}

  @Get(':id')
  @Render('talents/show')
  async show(@Param('id') id: string, @Req() req: any) {
    const talentId = Number(id);
    const talent = await this.repo.findOne({ where: { id } });
    if (!talent) throw new NotFoundException();

    // 戻るリンクやリクエスト用にログインユーザーの company_id を使う
    const companyId = req.user?.company_id ?? '';

    // PDF 表示：skill_sheet を優先、無ければ portfolio
    // DBの値が「実ファイルパス」の場合は、認証付き配信ルートにマッピングするのが安全
    // 例) /files/talents/:id/skill-sheet.pdf /files/talents/:id/portfolio.pdf など
    // ここでは、既に公開可能URLが入っている前提ならそのまま使い、
    // 内部パスなら専用の配信URLに変換する、という二段構えにしておく。
    const toPublicUrl = (p?: string | null) => {
      if (!p) return null;
      // 簡易判定：すでに http(s) ならそのまま、そうでなければ配信エンドポイントに委譲
      if (p.startsWith('http://') || p.startsWith('https://') || p.startsWith('/')) return p;
      // 任意: あなたの配信エンドポイントに合わせて変更
      return `/files/serve?path=${encodeURIComponent(p)}`;
    };

    const skillSheetPdfUrl = toPublicUrl(talent.skill_sheet_pdf_path || undefined);
    const portfolioPdfUrl  = toPublicUrl(talent.portfolio_pdf_path || undefined);
    const back = typeof req.query?.back === 'string' ? req.query.back : null;

    return {
      title: '要員詳細',
      companyId,
      back,                       // ← 追加
      talent: {
        id: talent.id,
        internal_name: talent.internal_name,
        age: talent.age,
        role: talent.role,
        prefecture: talent.prefecture,
        desired_rate: talent.desired_rate,
        work_style_level: talent.work_style_level,
        available_from: talent.available_from ? (talent.available_from as any).toISOString?.().slice(0,10) ?? talent.available_from : null,
        summary_text: talent.summary_text,
        area: talent.area, // ← 追加

        // 生のDB値（必要ならHBSで直接使えるようにも渡す）
        skill_sheet_url: talent.skill_sheet_url,
        skill_sheet_pdf_path: talent.skill_sheet_pdf_path,
        portfolio_pdf_path: talent.portfolio_pdf_path,

        // 表示用（iframeやリンクに使うURL）
        skill_sheet_pdf_url: skillSheetPdfUrl,
        portfolio_pdf_url: portfolioPdfUrl,
      },
    };
  }
}
