import { Controller, Get, Post, Param, Query, Body, Render, UseGuards, Req, Res } from '@nestjs/common';
import { AdminGuard } from '../guards/admin.guard';
import { UserListQueryDto } from './dto/user-list-query.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { toInt, paginate } from '../common/pagination';
import { UsersService } from './users.service';

@UseGuards(AdminGuard)
@Controller('admin/users')
export class UsersController {
  constructor(private readonly service: UsersService) {}

  // 一覧
  @Get()
  @Render('admin/users/index')
  async index(@Query() q: UserListQueryDto) {
    const page = toInt(q.page, 1);
    const perPage = toInt(q.perPage, 10);

    const { items, total } = await this.service.list({ ...q, page, perPage });
    const companyOptions = await this.service.companyOptionsActiveOnly();
    return {
      title: 'ユーザー一覧',
      q,
      companyOptions,
      ...paginate(items, total, page, perPage),
    };
  }

  // 新規
  @Get('new')
  @Render('admin/users/new')
  async new(@Req() req: any) {
    const csrfToken = req.csrfToken?.();
    const companyOptions = await this.service.companyOptionsActiveOnly();
    return { title: 'ユーザー 新規作成', companyOptions, csrfToken };
  }

  // ▼ 一覧（list.hbs）
  @Get('list')
  @Render('admin/users/list')
  async list(@Query() q: UserListQueryDto, @Req() req: any) {
    const page = toInt(q.page, 1);
    const perPage = toInt(q.perPage, 10);

    const { items, total } = await this.service.list({ ...q, page, perPage });
    const companyOptions = await this.service.companyOptionsActiveOnly();
    const csrfToken = req.csrfToken?.();

    return {
      title: 'ユーザー一覧',
      q,
      companyOptions,
      csrfToken,
      ...paginate(items, total, page, perPage),
    };
  }

  // 作成
  @Post()
  async create(@Body() body: CreateUserDto, @Res() res: any) {
    console.log('RAW body.company_id =', body.company_id); // ← ここ
    if (body.company_id == null || Number.isNaN(Number(body.company_id))) {
      return res.status(400).send('company_id is required');
    }
    await this.service.create(body);
    return res.redirect('/admin/users/list');
  }

  // 編集
  @Get(':id/edit')
  @Render('admin/users/edit')
  async edit(@Param('id') id: string, @Req() req: any) {
    const csrfToken = req.csrfToken?.();
    const user = await this.service.findOne(+id);
    const companyOptions = await this.service.companyOptionsActiveOnly();
    return { title: 'ユーザー 編集', user, companyOptions, csrfToken };
  }

  // 更新
  @Post(':id')
  async update(@Param('id') id: string, @Body() body: UpdateUserDto, @Res() res: any) {
    await this.service.update(+id, body);
    res.redirect('/admin/users');
  }
}
