import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Req,
  Res,
  Render,
  ForbiddenException,
  NotFoundException,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';

import { UsersService } from '../admin/users/users.service';

import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CompanyAccessGuard } from '../auth/company-access.guard';
import { CreateUserDto } from '../admin/users/dto/create-user.dto';
import { UpdateUserDto } from '../admin/users/dto/update-user.dto';

@UseGuards(AuthGuard, RolesGuard, CompanyAccessGuard)
@Roles('admin', 'manager')
@Controller('companies/:companyId/settings/users')
export class SettingsUsersController {
  constructor(private readonly users: UsersService) {}

  private getCompanyId(req: any): number {
    const cid = Number(req.session?.user?.company_id);
    if (!cid) throw new ForbiddenException('企業スコープが不正です');
    return cid;
  }

  // ==============================
  // 一覧
  // ==============================
  @Get()
  @Render('settings/users/list')
  async list(
    @Req() req,
    @Param('companyId', ParseIntPipe) companyId: number,
  ) {
    // companyId は URL だが、セッション一致は Guard で保証済み
    const { items, total } = await this.users.list({ companyId, page: 1, perPage: 50 });

    return {
      title: 'ユーザー管理',
      companyId,
      items,
      total,
    };
  }

  // ==============================
  // 新規フォーム
  // ==============================
  @Get('new')
  @Render('settings/users/new')
  async new(@Req() req, @Param('companyId', ParseIntPipe) companyId: number) {
    const csrfToken = typeof req.csrfToken === 'function' ? req.csrfToken() : undefined;
    return { title: 'ユーザー登録', companyId, csrfToken };
  }

  // ==============================
  // 作成
  // ==============================
  @Post()
  async create(@Body() body: CreateUserDto, @Req() req, @Res() res) {
    const companyId = this.getCompanyId(req);
    const meRole = String(req.session?.user?.role || '');

    // manager は admin ユーザーの作成を禁止
    if (meRole === 'manager' && String(body.role) === 'admin') {
      return res.redirect(`/companies/${companyId}/settings/users?warn=managerはadminを作成できません`);
    }

    await this.users.create({ ...body, company_id: companyId }); // company_id はセッションから強制
    return res.redirect(`/companies/${companyId}/settings/users?msg=作成しました`);
  }
  // 編集フォーム
  @Get(':userId/edit')
  @Render('settings/users/edit')
  async edit(
    @Req() req,
    @Param('companyId', ParseIntPipe) companyId: number,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    const user = await this.users.findOne(companyId, userId);
    const csrfToken = typeof req.csrfToken === 'function' ? req.csrfToken() : undefined;
    return { title: 'ユーザー編集', companyId, user, csrfToken };
  }

  // 更新（POSTとPATCH両対応にしておくと運用ラク）
  @Post(':userId')
  async update(
    @Body() body: UpdateUserDto,
    @Req() req, @Res() res,
    @Param('companyId', ParseIntPipe) companyId: number,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    const meId   = Number(req.session?.user?.id);
    const meRole = String(req.session?.user?.role || '');

    // 対象ユーザーを企業スコープで取得
    const target = await this.users.findOne(companyId, userId);

    // ① manager は admin ユーザーを一切編集できない
    if (meRole === 'manager' && String((target as any).role) === 'admin') {
      return res.redirect(`/companies/${companyId}/settings/users?warn=managerはadminを変更できません`);
    }

    // ② admin の降格（admin -> manager/member）を制約
    const nextRole = body.role ? String(body.role) : String((target as any).role);

    const isDemoteAdmin = String((target as any).role) === 'admin' && nextRole !== 'admin';
    if (isDemoteAdmin) {
      // admin 以外は降格操作不可
      if (meRole !== 'admin') {
        return res.redirect(`/companies/${companyId}/settings/users?warn=adminのみadmin降格を変更できます`);
      }

      // 現在のadmin数を数える
      const { total: adminTotalRaw, items: adminItems } = await this.users.list({
        companyId,
        role: 'admin',
        page: 1,
        perPage: 1000,
      });
      const adminCount = typeof adminTotalRaw === 'number' ? adminTotalRaw : adminItems.length;

      // ③ 対象が唯一のadminなら降格禁止
      if (adminCount <= 1) {
        return res.redirect(`/companies/${companyId}/settings/users?warn=最後の管理者を降格できません`);
      }

      // ④ 自分が唯一のadminで自分を降格しようとするのも禁止（上と同義だが明示）
      if (Number((target as any).id) === meId && adminCount <= 1) {
        return res.redirect(`/companies/${companyId}/settings/users?warn=唯一の管理者は自分を降格できません`);
      }
    }

    await this.users.update(companyId, userId, { ...body, company_id: companyId });
    return res.redirect(`/companies/${companyId}/settings/users?msg=更新しました`);
  }

  @Post(':userId/delete')
  async remove(
    @Req() req,
    @Res() res,
    @Param('companyId', ParseIntPipe) companyId: number,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    const meId   = Number(req.session?.user?.id);
    const meRole = String(req.session?.user?.role || '');

    const target = await this.users.findOne(companyId, userId);

    // manager は admin を削除できない
    if (meRole === 'manager' && String((target as any).role) === 'admin') {
      return res.redirect(`/companies/${companyId}/settings/users?warn=managerはadminを削除できません`);
    }

    // 自分は削除させない
    if (Number((target as any).id) === meId) {
      return res.redirect(`/companies/${companyId}/settings/users?warn=自分のアカウントは削除できません`);
    }

    // 最後の admin は削除禁止
    const { total: adminTotalRaw, items: adminItems } = await this.users.list({
      companyId,
      role: 'admin',
      page: 1,
      perPage: 1000,
    });
    const adminCount = typeof adminTotalRaw === 'number' ? adminTotalRaw : adminItems.length;

    if (String((target as any).role) === 'admin' && adminCount <= 1) {
      return res.redirect(`/companies/${companyId}/settings/users?warn=最後の管理者は削除できません`);
    }

    await this.users.remove(companyId, userId);
    return res.redirect(`/companies/${companyId}/settings/users?msg=削除しました`);
  }
}
