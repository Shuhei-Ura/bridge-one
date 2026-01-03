// src/settings/settings-talents.controller.ts
import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Req,
  Res,
  Render,
  UseGuards,
  ForbiddenException,
  NotFoundException,
  ParseIntPipe,
  Query,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';

import { AuthGuard } from '../auth/auth.guard';
import { CompanyAccessGuard } from '../auth/company-access.guard';

import { CompanyTalentService } from '../talents/services/company-talent.service';
import { CreateTalentDto } from '../talents/dto/create-talent.dto';
import { UpdateTalentDto } from '../talents/dto/update-talent.dto';

type MulterFile = import('multer').File;

function pickFile(reqFiles: any, fieldName: string): MulterFile | undefined {
  if (!reqFiles) return undefined;
  if (Array.isArray(reqFiles)) {
    return reqFiles.find((f) => f?.fieldname === fieldName);
  }
  if (reqFiles && typeof reqFiles === 'object') {
    const arr = reqFiles[fieldName];
    if (Array.isArray(arr) && arr.length > 0) return arr[0];
  }
  return undefined;
}

@UseGuards(AuthGuard, CompanyAccessGuard)
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    transformOptions: { enableImplicitConversion: true },
  }),
)
@Controller('companies/:companyId/settings/talents')
export class SettingsTalentsController {
  constructor(private readonly talents: CompanyTalentService) {}

  private getCompanyIdOrThrow(req: any, urlCompanyId: number): number {
    const sessionCompanyId = Number(req.session?.user?.company_id);
    if (!sessionCompanyId) throw new ForbiddenException('企業スコープが不正です');
    if (sessionCompanyId !== urlCompanyId) {
      throw new ForbiddenException('他社スコープへのアクセスは許可されていません');
    }
    return sessionCompanyId;
  }

  // ==============================
  // 一覧
  // ==============================
  @Get()
  @Render('settings/talents/list')
  async list(
    @Req() req,
    @Param('companyId', ParseIntPipe) companyId: number,
    @Query() query: any, // CompanySearchTalentDto 相当
  ) {
    this.getCompanyIdOrThrow(req, companyId);

    const csrfToken =
      typeof req.csrfToken === 'function' ? req.csrfToken() : undefined;

    // ✅ service は 0 始まりなので、ここで 0 始まりに正規化
    const pageOneBased = Number(query.page) || 1;
    const page = Math.max(0, pageOneBased - 1);
    const pageSize = Number(query.pageSize) || 50;

    const { items, total } = await this.talents.search(String(companyId), {
      ...query,
      page,
      pageSize,
    });

    // ▼ 検索条件を保持する backEnc を生成
    const params = new URLSearchParams();
    const rawFilters: Record<string, any> = {
      name: query.name,
      summary: query.summary,
      maxAge: query.maxAge,
      maxDesiredRate: query.maxDesiredRate,
      prefecture: query.prefecture,
      status: query.status,
    };
    for (const [k, v] of Object.entries(rawFilters)) {
      if (v != null && v !== '') params.set(k, String(v));
    }
    params.set('page', String(page + 1));
    params.set('pageSize', String(pageSize));
    const qs = params.toString();
    const back = `/companies/${companyId}/settings/talents?${qs}`;
    const backEnc = encodeURIComponent(back);

    return {
      title: '自社要員一覧',
      companyId,
      items,
      total,
      q: { ...query, page }, // UI用の保持
      msg: req.query?.msg || null,
      warn: req.query?.warn || null,
      err: req.query?.err || null,
      csrfToken,
      backEnc, // ← これをHBSで ?back= に使う
    };
  }

  // ==============================
  // 新規フォーム
  // ==============================
  @Get('new')
  @Render('settings/talents/new')
  async new(@Req() req, @Param('companyId', ParseIntPipe) companyId: number) {
    this.getCompanyIdOrThrow(req, companyId);
    const csrfToken =
      typeof req.csrfToken === 'function' ? req.csrfToken() : undefined;

    const selects = {
      statuses: ['marketing', 'interview', 'working', 'left'],
      workStyles: ['remote', 'hybrid', 'onsite'],
    };

    return { title: '自社要員登録', companyId, csrfToken, selects };
  }

  // ==============================
  // 作成
  // ==============================
  @Post()
  async create(
    @Body() body: CreateTalentDto,
    @Req() req,
    @Res() res,
    @Param('companyId', ParseIntPipe) companyId: number,
  ) {
    this.getCompanyIdOrThrow(req, companyId);

    const skillSheetFile = pickFile((req as any).files, 'skill_sheet_file');
    const portfolioFile = pickFile((req as any).files, 'portfolio_file');

    await this.talents.create(String(companyId), body, {
      skillSheetFile,
      portfolioFile,
    });

    return res.redirect(
      `/companies/${companyId}/settings/talents?msg=作成しました`,
    );
  }

  // ==============================
  // 編集フォーム
  // ==============================
  @Get(':talentId/edit')
  @Render('settings/talents/edit')
  async edit(
    @Req() req,
    @Param('companyId', ParseIntPipe) companyId: number,
    @Param('talentId') talentId: string, // BIGINTはstringで扱う
    @Query('back') back?: string,
  ) {
    this.getCompanyIdOrThrow(req, companyId);

    const talent = await this.talents.findOne(
      String(companyId),
      String(talentId),
    );
    if (!talent) throw new NotFoundException('要員が見つかりません');

    const csrfToken =
      typeof req.csrfToken === 'function' ? req.csrfToken() : undefined;
    const selects = {
      statuses: ['marketing', 'interview', 'working', 'left'],
      workStyles: ['remote', 'hybrid', 'onsite'],
    };

    return {
      title: '自社要員編集',
      companyId,
      talent,
      csrfToken,
      selects,
      back: back || null, // ← 受け取った back をそのまま渡す
    };
  }

  // ==============================
  // 更新（POSTで運用）
  // ==============================
  @Post(':talentId')
  async update(
    @Body() body: UpdateTalentDto & { back?: string },
    @Req() req,
    @Res() res,
    @Param('companyId', ParseIntPipe) companyId: number,
    @Param('talentId') talentId: string, // BIGINTはstringで扱う
  ) {
    this.getCompanyIdOrThrow(req, companyId);

    const skillSheetFile = pickFile((req as any).files, 'skill_sheet_file');
    const portfolioFile = pickFile((req as any).files, 'portfolio_file');

    await this.talents.update(String(companyId), String(talentId), body, {
      skillSheetFile,
      portfolioFile,
    });

    // back が送られてきたら優先して戻す
    if (body.back) return res.redirect(body.back);
    return res.redirect(
      `/companies/${companyId}/settings/talents?msg=更新しました`,
    );
  }

  // ==============================
  // 削除（POSTで運用）
  // ==============================
  @Post(':talentId/delete')
  async remove(
    @Req() req,
    @Res() res,
    @Param('companyId', ParseIntPipe) companyId: number,
    @Param('talentId') talentId: string, // BIGINTはstringで扱う
    @Body('back') back?: string,
  ) {
    this.getCompanyIdOrThrow(req, companyId);

    await this.talents.remove(String(companyId), String(talentId));

    if (back) return res.redirect(back);
    return res.redirect(
      `/companies/${companyId}/settings/talents?msg=削除しました`,
    );
  }
}
