import {
  Controller, Get, Post, Param, Body, Render, UseGuards, Req, Res, NotFoundException
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { AuthGuard } from '../../auth/auth.guard';
import { RolesGuard } from '../../auth/roles.guard';   // ← ファイル名に合わせて
import { Roles } from '../../auth/roles.decorator';

import { Company } from '../../companies/company.entity';
import { UsersService } from '../users/users.service';
import { CreateUserDto } from '../users/dto/create-user.dto';

// 認証 → 役割(admin) の順でチェック。companyスコープは不要
@UseGuards(AuthGuard, RolesGuard)
@Roles('admin')
@Controller('admin/companies/:companyId/users')
export class CompanyUsersController {
  constructor(
    @InjectRepository(Company) private readonly companies: Repository<Company>,
    private readonly users: UsersService,
  ) {}

  private async loadCompanyOr404(companyId: string) {
    const c = await this.companies.findOne({ where: { id: companyId as any } });
    if (!c) throw new NotFoundException('Company not found');
    return c;
  }

  // 一覧
  @Get()
  @Render('admin/company-users/list')
  async list(@Param('companyId') companyId: string) {
    const company = await this.loadCompanyOr404(companyId);
    // 既存 UsersService.list を再利用（companyId フィルタ）
    const { items, total } = await this.users.list({ companyId: +companyId, page: 1, perPage: 50 });
    return { title: `ユーザー一覧 - ${company.name}`, company, items, total };
  }

  // 新規フォーム
  @Get('new')
  @Render('admin/company-users/new')
  async new(@Param('companyId') companyId: string, @Req() req: any) {
    const company = await this.loadCompanyOr404(companyId);
    const csrfToken = req.csrfToken?.();
    return { title: `ユーザー登録 - ${company.name}`, company, csrfToken };
  }

  // 作成（URLの companyId を強制適用）
  @Post()
  async create(@Param('companyId') companyId: string, @Body() body: CreateUserDto, @Res() res: any) {
    // UsersService.create は company_id を見る実装（復旧済み）なので付与して渡す
    await this.users.create({ ...body, company_id: +companyId } as any);
    return res.redirect(`/admin/companies/${companyId}/users`);
  }

  // 編集フォーム
  @Get(':id/edit')
  @Render('admin/company-users/edit')
  async edit(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Req() req: any,
  ) {
    const company = await this.loadCompanyOr404(companyId);
    const user = await this.users.findOne(+id); // relations: ['company'] を返す想定
    const cidFromUser = Number(user?.company?.id);
    const cidFromParam = Number(companyId);

    if (!user || cidFromUser !== cidFromParam) {
      throw new NotFoundException('User not found in this company');
    }

    const csrfToken = req.csrfToken?.();
    return { title: `ユーザー編集 - ${company.name}`, company, user, csrfToken };
  }

  // 更新
  @Post(':id')
  async update(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() body: any,   // UpdateUserDto でもOK
    @Res() res: any,
  ) {
    body.company_id = Number(companyId);      // 会社固定
    await this.users.update(+id, body);       // UsersService.update で password空は据え置き
    return res.redirect(`/admin/companies/${companyId}/users`);
  }
}
