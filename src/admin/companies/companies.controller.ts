// 置き換え後の先頭インポート例（差分だけ）
import { Controller, Get, Post, Param, Query, Body, Render, UseGuards, Req, Res } from '@nestjs/common';
import { AuthGuard } from '../../auth/auth.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import { CompanyListQueryDto } from './dto/company-list-query.dto';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { toInt, paginate } from '../common/pagination';
import { CompaniesService } from './companies.service';

// ↓ クラスデコレータをこれに変更
@UseGuards(AuthGuard, RolesGuard)
@Roles('admin')                           // ★ adminのみ
@Controller('admin/companies')
export class CompaniesController {
  constructor(private readonly service: CompaniesService) {}

  @Get()
  @Render('admin/companies/index')
  async index(@Query() q: CompanyListQueryDto) {
    const page = toInt(q.page, 1);
    const perPage = toInt(q.perPage, 10);

    const { items, total } = await this.service.list({ ...q, page, perPage });
    return {
      title: '会社一覧',
      q,
      ...paginate(items, total, page, perPage),
    };
  }

  // 新規フォーム
  @Get('new')
  @Render('admin/companies/new')
  new(@Req() req: any) {
    const csrfToken = req.csrfToken?.();
    return { title: '会社 新規作成', csrfToken };
  }

  // ▼ 一覧（list.hbs）
  @Get('list')
  @Render('admin/companies/list')
  async list(@Query() q: CompanyListQueryDto, @Req() req: any) {
    const page = toInt(q.page, 1);
    const perPage = toInt(q.perPage, 10);
    const { items, total } = await this.service.list({ ...q, page, perPage });
    const csrfToken = req.csrfToken?.();

    return {
      title: '企業一覧',
      q,
      csrfToken,
      ...paginate(items, total, page, perPage),
    };
  }

  // 作成
  @Post()
  async create(@Body() body: CreateCompanyDto, @Res() res: any) {
    await this.service.create(body);                 // ← 実行！
    return res.redirect('/admin/companies/list');   // 一覧へ
  }

  // 編集フォーム
  @Get(':id/edit')
  @Render('admin/companies/edit')
  async edit(@Param('id') id: string, @Req() req: any) {
    const csrfToken = req.csrfToken?.();
    const company = await this.service.findOne(Number(id));   // ★DBから取得

    // 見つからない場合は 404 を投げてもOK（任意）
    // if (!company) throw new NotFoundException('Company not found');

    return { title: '企業 編集', company, csrfToken };
  }

  // 更新
  @Post(':id')
  async update(@Param('id') id: string, @Body() body: UpdateCompanyDto, @Res() res: any) {
    await this.service.update(+id, body); // ← ★ これでOK
    res.redirect('/admin/companies');
  }

}
