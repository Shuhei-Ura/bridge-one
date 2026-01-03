// src/opportunities/opportunities.controller.ts
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
  UsePipes,
  ValidationPipe,
  ForbiddenException,
  Query
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CompanyAccessGuard } from '../auth/company-access.guard';
import { CompanyTypeGuard } from '../auth/company-type.guard';
import { OpportunitiesService } from './opportunities.service';
import { CreateOpportunityDto } from './dto/create-opportunity.dto';

@Controller()
@UseGuards(AuthGuard, CompanyAccessGuard, new CompanyTypeGuard(['end']))
export class OpportunitiesController {
  constructor(private readonly opps: OpportunitiesService) {}

  /**
   * 案件一覧（※あとで一覧ページを作るときに利用予定）
   */
  @Get('/companies/:companyId/opportunities')
  @Render('opportunities/index')
  async list(
    @Param('companyId') companyId: string,
    @Query('page') page?: string,
    @Query('is_active') is_active?: '1' | '0',
    @Query('q') q?: string,
    @Req() req?: any,
  ) {
    const result = await this.opps.listForCompany(companyId, { page: Number(page ?? 1), is_active, q });
    return {
      companyId,
      csrfToken: req?.csrfToken?.() ?? req?.csrfToken,
      q: q ?? '',
      is_active: is_active ?? '',
      ...result,
    };
  }
  /**
   * 新規登録フォーム
   * GET /companies/:companyId/opportunities/new
   */
  @Get('/companies/:companyId/opportunities/new')
  @Render('opportunities/new')
  async newForm(@Param('companyId') companyId: string, @Req() req: any) {
    await this.opps.assertCompanyExists(companyId); // 存在だけ確認。end判定は Guard が担当

    return {
      companyId,
      csrfToken: req.csrfToken?.() ?? req.csrfToken,
    };
  }

  /**
   * 登録処理
   * POST /companies/:companyId/opportunities
   */
  @Post('/companies/:companyId/opportunities')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async create(
    @Param('companyId') companyId: string,
    @Body() body: any,
    @Res() res: any,
  ) {
    const dto: CreateOpportunityDto = {
      title: body.title,
      summary: body.summary,
      role: body.role,
      prefecture: body.prefecture || undefined,
      work_style: body.work_style,
      start_date: body.start_date || undefined,
      end_date: body.end_date || undefined,
      price_range: body.price_range || undefined,
      max_age: body.max_age ? Number(body.max_age) : undefined,
      is_active: body.is_active === '1' || body.is_active === 'on',
    };

    try {
      const created = await this.opps.create(companyId, dto);
      return res.redirect(
        `/companies/${companyId}/dashboard?created_opp=${created.id}`,
      );
    } catch (err) {
      throw new ForbiddenException('登録に失敗しました: ' + err.message);
    }
  }

  // 詳細ページを追加
  @Get('/companies/:companyId/opportunities/:id')
  @Render('opportunities/show')
  async show(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    const opp = await this.opps.findOneByCompany(companyId, id);
    return { companyId, opp };
  }
}
