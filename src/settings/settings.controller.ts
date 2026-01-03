// src/settings/settings.controller.ts
import {
  Controller,
  Get,
  Post,
  Req,
  Res,
  Body,
  UseGuards,
  Param,
  ParseIntPipe,
  Render,
  NotFoundException,
} from '@nestjs/common';
import { CompaniesService } from '../admin/companies/companies.service';

// 企業スコープ & 権限ガード
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { CompanyAccessGuard } from '../auth/company-access.guard';
import { Roles } from '../auth/roles.decorator';

@UseGuards(AuthGuard, RolesGuard, CompanyAccessGuard)
@Roles('admin', 'manager')
@Controller('companies/:companyId/settings/company')
export class SettingsController {
  constructor(private readonly companies: CompaniesService) {}

  // 会社設定フォーム（自社のみ）
  @Get()
  @Render('settings/company')
  async companyForm(
    @Req() req,
    @Param('companyId', ParseIntPipe) companyId: number,
  ) {
    const company = await this.companies.findOne(companyId);
    if (!company) throw new NotFoundException('company not found');

    const csrfToken = typeof req.csrfToken === 'function' ? req.csrfToken() : undefined;

    return {
      title: '会社情報の変更',
      companyId,
      company,
      csrfToken,
    };
  }

  // 会社設定更新
  @Post()
  async companyUpdate(
    @Req() req,
    @Res() res,
    @Param('companyId', ParseIntPipe) companyId: number,
    @Body() body: any,
  ) {
    // ホワイトリスト更新（変更可能な項目のみ）
    const payload: Record<string, any> = {
      name: (body.name ?? '').trim(),
      domain: body.domain?.trim() || null,
      // ここに許可したい項目だけ追加していく（is_active 等は必要に応じて）
    };

    await this.companies.update(companyId, payload);

    return res.redirect(`/companies/${companyId}/settings/company?msg=保存しました`);
  }
}
