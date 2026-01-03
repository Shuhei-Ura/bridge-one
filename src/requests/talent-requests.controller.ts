import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Render,
  Req,
  Res,
  UseGuards,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import type { Response, Request } from 'express';

import { TalentRequestsService } from './talent-requests.service';
import { CreateTalentRequestDto } from './dto/create-talent-request.dto';
import { UpdateTalentRequestDto } from './dto/update-talent-request.dto';

import { AuthGuard } from '../auth/auth.guard';
import { CompanyAccessGuard } from '../auth/company-access.guard';

@UseGuards(AuthGuard, CompanyAccessGuard)
@Controller('companies/:companyId/requests')
export class TalentRequestsController {
  constructor(private readonly service: TalentRequestsService) {}

  private ensureSameCompanyOrThrow(companyIdParam: string, req: Request) {
    const cidParam = String(companyIdParam);
    const authedCompanyId = String(
      (req as any).company?.id ?? (req as any).user?.company_id,
    );
    if (!authedCompanyId || authedCompanyId !== cidParam) {
      throw new ForbiddenException('companyId mismatched.');
    }
    return authedCompanyId;
  }

  // フォーム表示: /companies/:companyId/requests/new?talent_id=123
  @Get('new')
  @Render('requests/talent-new')
  async new(
    @Param('companyId') companyId: string,
    @Req() req: Request,
  ) {
    const talentId = Number((req.query?.talent_id as string) ?? '');
    if (!talentId) throw new BadRequestException('talent_id is required');

    const authedCompanyId = this.ensureSameCompanyOrThrow(companyId, req);

    return {
      csrfToken: (req as any).csrfToken?.(),
      companyId: Number(authedCompanyId),
      talentId,
      values: {
        request_title: '',
        message_text: '',
        talent_id: talentId,
      },
      errors: {},
    };
  }

  // 入力に戻る: POST /companies/:companyId/requests/new?talent_id=123
  @Post('new')
  @Render('requests/talent-new')
  async newPost(
    @Param('companyId') companyId: string,
    @Req() req: Request,
    @Body() body: any,
  ) {
    const talentId = Number(
      (req.query?.talent_id as string) ?? body?.talent_id ?? '',
    );
    if (!talentId) throw new BadRequestException('talent_id is required');

    const authedCompanyId = this.ensureSameCompanyOrThrow(companyId, req);
    return {
      csrfToken: (req as any).csrfToken?.(),
      companyId: Number(authedCompanyId),
      talentId,
      values: {
        request_title: body?.request_title ?? '',
        message_text: body?.message_text ?? '',
        talent_id: talentId,
      }, // 入力値を復元
      errors: {},
    };
  }

  // 確認画面表示: POST /companies/:companyId/requests/confirm
  @Post('confirm')
  @Render('requests/talent-confirm')
  async confirm(
    @Param('companyId') companyId: string,
    @Body() body: CreateTalentRequestDto,
    @Req() req: Request,
  ) {
    if (!body.talent_id) throw new BadRequestException('talent_id is required');

    const authedCompanyId = this.ensureSameCompanyOrThrow(companyId, req);

    // Talent 存在チェック（UX向上）
    await this.service.ensureTalentExists(Number(body.talent_id));

    return {
      csrfToken: (req as any).csrfToken?.(),
      companyId: Number(authedCompanyId),
      talentId: body.talent_id,
      requestTitle: body.request_title, // 確認画面表示用
      message: body.message_text,       // pre で改行維持
      // 「修正する」で戻すための復元値
      values: {
        request_title: body.request_title,
        message_text: body.message_text,
        talent_id: body.talent_id,
      },
    };
  }

  // 送信（保存）: POST /companies/:companyId/requests
  @Post()
  async create(
    @Param('companyId') companyId: string,
    @Body() body: CreateTalentRequestDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    if (!body.talent_id) throw new BadRequestException('talent_id is required');

    const authedCompanyId = this.ensureSameCompanyOrThrow(companyId, req);
    const userId = String((req as any).user?.id);
    if (!userId) throw new ForbiddenException('user not found');

    await this.service.create({
      fromCompanyId: authedCompanyId,
      fromUserId: userId,
      talentId: Number(body.talent_id),
      requestTitle: body.request_title,    // ★ 追加
      messageText: body.message_text,
    });

    return res.redirect(`/companies/${authedCompanyId}/requests/sent`);
  }

  @Get('sent')
  @Render('requests/talent-sent')
  async sentList(
    @Param('companyId') companyId: string,
    @Req() req: Request,
  ) {
    const authedCompanyId = this.ensureSameCompanyOrThrow(companyId, req);

    const statusFilter = (req.query?.status as string) || '';
    const page = Number(req.query?.page ?? 1);

    const { list, total, page: currentPage, maxPage } =
      await this.service.findSentRequests(String(authedCompanyId), statusFilter, page, 30);

    return {
      companyId: Number(authedCompanyId),
      requests: list,
      selectedStatus: statusFilter,
      total,
      page: currentPage,  // ←ここをpageに合わせる
      pages: maxPage,     // ←range用にpagesを渡す
    };
  }

  // 送信箱 詳細+編集
  @Get('sent/:id')
  @Render('requests/talent-sent-edit')
  async sentEditPage(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    const authedCompanyId = this.ensureSameCompanyOrThrow(companyId, req);
    const rec = await this.service.findOneForSent(
      String(authedCompanyId),
      String(id),
    );
    if (!rec) throw new NotFoundException('Request not found');

    const talentWithUrls = rec.talent
      ? this.service.decorateTalentDocUrls(rec.talent as any)
      : null;

    return {
      csrfToken: (req as any).csrfToken?.(),
      companyId: Number(authedCompanyId),
      request: { ...rec, talent: talentWithUrls },
    };
  }

  // 保存（更新）: message_text を更新（pending のみ）
  @Post('sent/:id')
  async sentUpdate(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Req() req: Request,
    @Body() body: UpdateTalentRequestDto,
    @Res() res: Response,
  ) {
    const authedCompanyId = this.ensureSameCompanyOrThrow(companyId, req);
    await this.service.updateMessageIfEditable({
      id: String(id),
      fromCompanyId: String(authedCompanyId),
      requestTitle: body.request_title,   // ★ 追加
      messageText: body.message_text,
    });
    return res.redirect(`/companies/${authedCompanyId}/requests/sent/${id}`);
  }

  // 取り下げ（→ status = expired）
  @Post('sent/:id/withdraw')
  async sentWithdraw(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const authedCompanyId = this.ensureSameCompanyOrThrow(companyId, req);
    await this.service.withdrawIfEditable({
      id: String(id),
      fromCompanyId: String(authedCompanyId),
    });
    return res.redirect(`/companies/${authedCompanyId}/requests/sent`);
  }
}
