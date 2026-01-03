// src/requests/talent-requests-inbox.controller.ts
import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  Render,
  NotFoundException,
  Req,
  Res,
} from '@nestjs/common';
import type { Response, Request } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { CompanyAccessGuard } from '../auth/company-access.guard';
import { TalentRequestsService } from './talent-requests.service';
import { RespondRequestDto, RequestResponseAction } from './dto/respond-request.dto';

@UseGuards(AuthGuard, CompanyAccessGuard)
@Controller('/companies/:companyId/requests/inbox')
export class TalentRequestsInboxController {
  constructor(private readonly trService: TalentRequestsService) {}

  /**
   * 受信箱一覧
   * GET /companies/:companyId/requests/inbox?status=...&p=1
   */
  @Get()
  @Render('requests/inbox/list')
  async index(
    @Param('companyId') companyId: string,
    @Query('status') status?: string,
    @Query('p') p?: string,
  ) {
    const page = Math.max(parseInt(p ?? '1', 10) || 1, 1);
    const perPage = 30;

    const { list, total, maxPage } = await this.trService.findInboxRequests(
      companyId,
      status && status.trim() ? status.trim() : 'all',
      page,
      perPage,
    );

    return {
      title: '受信リクエスト一覧',
      companyId,
      items: list,              // [{ id, request_title, full_name, unit_price, prefecture, status }]
      total,
      page,
      lastPage: maxPage,
      perPage,
      statuses: ['all', 'pending', 'accepted', 'declined', 'cancelled'],
      currentStatus: status ?? 'all',
    };
  }

  /**
   * 受信箱 詳細
   * GET /companies/:companyId/requests/inbox/:id
   */
  @Get('/:id')
  @Render('requests/inbox/show')
  async show(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    const rec = await this.trService.findOneForInbox(companyId, id);
    if (!rec) throw new NotFoundException('Request not found');

    const csrfToken = (req as any).csrfToken ? (req as any).csrfToken() : undefined;

    return {
      title: '受信リクエスト詳細',
      companyId,
      request: rec,   // {...rec, full_name, unit_price, prefecture, can_view_sender}
      csrfToken,
    };
  }

  /**
   * 受信箱 応答（承諾 or 辞退）
   * POST /companies/:companyId/requests/inbox/:id/respond
   * body: { action: 'accept'|'decline', message?: string }
   */
  @Post('/:id/respond')
  async respond(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: RespondRequestDto,
    @Res() res: Response,
  ) {
    // DTOは "accepted" | "declined" を要求している前提
    const normalized = dto.action === 'accepted' ? 'accept' : 'decline';

    await this.trService.respondToInboxRequest({
      id,
      toCompanyId: companyId,
      action: normalized,           // サービス都合の値に正規化
      message: dto.message,
    });

    return res.redirect(`/companies/${companyId}/requests/inbox/${id}?updated=1`);
  }
}
