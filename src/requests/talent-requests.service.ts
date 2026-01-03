// src/requests/talent-requests.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TalentRequest } from './talent-request.entity';
import { Talent } from '../talents/talent.entity';

@Injectable()
export class TalentRequestsService {
  constructor(
    @InjectRepository(TalentRequest)
    private readonly trRepo: Repository<TalentRequest>,
    @InjectRepository(Talent)
    private readonly talentRepo: Repository<Talent>,
  ) {}

  /** uploads内などの相対パスを画面用URLに変換 */
  private toPublicUrl(p?: string | null): string | null {
    if (!p) return null;
    if (/^https?:\/\//i.test(p)) return p;             // すでに絶対URL
    return p.startsWith('/') ? p : `/uploads/${p}`;     // 相対→/uploads/ を付与
  }

  /** talent の *_file_path / *_pdf_path から *_file_url / *_pdf_url を生やす */
  decorateTalentDocUrls<T extends Record<string, any>>(talent: T): T {
    if (!talent) return talent;
    return {
      ...talent,
      skill_sheet_file_url: this.toPublicUrl(talent.skill_sheet_file_path),
      portfolio_file_url:   this.toPublicUrl(talent.portfolio_file_path),
      skill_sheet_pdf_url:  this.toPublicUrl(talent.skill_sheet_pdf_path),
      portfolio_pdf_url:    this.toPublicUrl(talent.portfolio_pdf_path),
    };
  }

  async ensureTalentExists(talentId: number): Promise<Talent> {
    const t = await this.talentRepo.findOne({
      where: { id: String(talentId) },
    });
    if (!t) throw new NotFoundException('Talent not found');
    return t;
  }

  async create(params: {
    fromCompanyId: string; // BIGINTをstring運用
    fromUserId: string;
    talentId: number;
    requestTitle: string;      // ★ 追加
    messageText: string;
  }): Promise<TalentRequest> {
    // 宛先talent存在チェック（to_company_id は DB トリガで付与）
    await this.ensureTalentExists(params.talentId);

    const rec = this.trRepo.create({
      from_company_id: params.fromCompanyId,
      from_user_id: params.fromUserId,
      talent_id: String(params.talentId),
      request_title: params.requestTitle,  // ★ 追加
      message_text: params.messageText,
      status: 'pending',
      // to_company_id は DB トリガで自動設定
    });
    return await this.trRepo.save(rec);
  }

  async findOne(id: number): Promise<TalentRequest | null> {
    return this.trRepo.findOne({
      where: { id: String(id) },
      loadEagerRelations: false,
    });
  }

  // 送信済み一覧（送信箱）
  async findSentRequests(companyId: string, statusFilter?: string, page = 1, perPage = 30) {
    const qb = this.trRepo
      .createQueryBuilder('req')
      .leftJoinAndSelect('req.talent', 'talent')
      .where('req.from_company_id = :cid', { cid: companyId })
      .orderBy('req.created_at', 'DESC');

    if (statusFilter && ['pending', 'approved', 'rejected', 'withdrawn', 'expired'].includes(statusFilter)) {
      qb.andWhere('req.status = :status', { status: statusFilter });
    }

    const total = await qb.getCount();
    const maxPage = Math.ceil(total / perPage);

    const list = await qb
      .skip((page - 1) * perPage)
      .take(perPage)
      .getMany();

    return { list, total, page, maxPage };
  }

  // 送信箱の1件（編集/詳細用）
  async findOneForSent(fromCompanyId: string, id: string) {
    return this.trRepo.findOne({
      where: { id: String(id), from_company_id: String(fromCompanyId) },
      relations: ['talent'],            // 詳細に必要なtalentのみ
      loadEagerRelations: false,
    });
  }

  // 文面更新（pending のみ）
  async updateMessageIfEditable(params: {
    id: string;
    fromCompanyId: string;
    requestTitle?: string;
    messageText: string;
  }) {
    const rec = await this.findOneForSent(params.fromCompanyId, params.id);
    if (!rec) throw new NotFoundException('Request not found');
    if (rec.status !== 'pending') {
      throw new ForbiddenException('Only pending requests can be edited');
    }

    let touched = false;

    if (typeof params.requestTitle === 'string') {
      const title = params.requestTitle.trim();
      if (title.length < 2 || title.length > 120) {
        throw new BadRequestException('request_title length invalid');
      }
      rec.request_title = title;
      touched = true;
    }

    const text = params.messageText?.trim() ?? '';
    if (text.length < 10) {
      throw new BadRequestException('message_text too short');
    }

    rec.message_text = text;
    return await this.trRepo.save(rec);
  }

  // 取り下げ（pending のみ → expired）
  async withdrawIfEditable(params: {
    id: string;
    fromCompanyId: string;
  }) {
    const rec = await this.findOneForSent(params.fromCompanyId, params.id);
    if (!rec) throw new NotFoundException('Request not found');
    if (rec.status !== 'pending') {
      throw new ForbiddenException('Only pending requests can be withdrawn');
    }

    rec.status = 'expired';
    return await this.trRepo.save(rec);
  }

  // ============================================================
  // ここから「受信箱（Inbox）」用 追加メソッド
  // ============================================================

  /**
   * 受信箱一覧
   * - /companies/:companyId/requests/inbox
   * - ステータス: 'all' | 'pending' | 'accepted' | 'declined' | 'cancelled'
   *   （混在環境に配慮して 'approved' | 'rejected' | 'withdrawn' | 'expired' も通す）
   */
  async findInboxRequests(
    toCompanyId: string,
    statusFilter?: string,
    page = 1,
    perPage = 30,
  ) {
    const qb = this.trRepo
      .createQueryBuilder('req')
      .leftJoinAndSelect('req.talent', 'talent')
      .where('req.to_company_id = :cid', { cid: String(toCompanyId) })
      .orderBy('req.created_at', 'DESC');

    const allowed = [
      'pending', 'accepted', 'declined', 'cancelled',
      // 既存混在対策（送信側旧ステータスの名残りを許容）
      'approved', 'rejected', 'withdrawn', 'expired',
    ];

    if (statusFilter && statusFilter !== 'all' && allowed.includes(statusFilter)) {
      qb.andWhere('req.status = :status', { status: statusFilter });
    }

    const total = await qb.getCount();
    const maxPage = Math.ceil(total / perPage);

    const list = await qb
      .skip((page - 1) * perPage)
      .take(perPage)
      .getMany();

    // 一覧表示に必要な項目を整形
    const normalized = list.map((r) => {
      const t: any = r.talent ?? {};

      // 本名
      const name =
        t.name ?? t.full_name ?? t.fullName ?? '-';

      // 単価（desired_rate を最優先）
      const desired_rate =
        t.desired_rate ??
        (r as any).unit_price ??       // 旧キーがあれば拾う
        t.expected_unit_price ??
        t.unit_price ??
        '-';

      // 都道府県
      const prefecture =
        t.prefecture ?? t.pref_name ?? t.address_prefecture ?? '-';

      // ← ここが重要：必ず文字列として含める
      const talent_id = String((r as any).talent_id ?? t.id ?? '');


      return {
        id: r.id,
        request_title: r.request_title,
        name,
        desired_rate,
        prefecture,
        status: r.status,
        talent_id,           // ← 一覧テンプレで使う
      };
    });

    return { list: normalized, total, page, maxPage };
  }

  /**
   * 受信箱 詳細
   * - 承諾済み(accepted)の場合のみ、送信者メールの開示を想定
   */
  async findOneForInbox(toCompanyId: string, id: string) {
    const rec = await this.trRepo.findOne({
      where: { id: String(id), to_company_id: String(toCompanyId) },
      relations: ['talent'],
      loadEagerRelations: false,
    });
    if (!rec) return null;

    const t: any = rec.talent ?? {};

    const name = t.name ?? t.full_name ?? '-';
    const desired_rate =
      t.desired_rate ?? t.unit_price ?? '-';
    const prefecture =
      t.prefecture ?? t.pref_name ?? '-';

    // ---- 送信者メールの取得 ----
    let sender_email: string | null = null;
    if (rec.status === 'accepted' && rec.from_user_id) {
      const [row] = await this.trRepo.query(
        `SELECT email FROM users WHERE id = ? LIMIT 1`,
        [rec.from_user_id],
      );
      sender_email = row?.email ?? null;
    }

    return {
      ...rec,
      name,
      desired_rate,
      prefecture,
      can_view_sender: rec.status === 'accepted',
      sender_email,
    };
  }

  /**
   * 受信箱 応答（承諾 or 辞退）
   * - pending のみ更新可
   * - action: 'accept' | 'decline'
   * - message は response_message に保存（カラムが存在しない環境でも無害に）
   */
  async respondToInboxRequest(params: {
    id: string;
    toCompanyId: string;
    action: 'accept' | 'decline';
    message?: string;
  }) {
    const rec = await this.trRepo.findOne({
      where: { id: String(params.id), to_company_id: String(params.toCompanyId) },
      loadEagerRelations: false,
    });
    if (!rec) throw new NotFoundException('Request not found');

    if (rec.status !== 'pending') {
      throw new ForbiddenException('This request has already been processed');
    }

    rec.status = params.action === 'accept' ? 'accepted' : 'declined';

    // 任意メッセージ（存在すれば保存）
    if ('response_message' in rec) {
      (rec as any).response_message = params.message?.trim() || null;
    }
    if ('responded_at' in rec) {
      (rec as any).responded_at = new Date();
    }

    return await this.trRepo.save(rec);
  }

  /**
   * 送信者メールの取得（from_user_id → users.email）
   * 依存を増やさないために生SQLで取得する。テーブル候補を順に試す。
   */
  async getSenderEmailByFromUserId(fromUserId: string | number): Promise<string | null> {
    const id = String(fromUserId);
    const candidates = ['users', 'admin_users', 'app_users'];

    for (const table of candidates) {
      try {
        const rows = await this.trRepo.query(
          `SELECT email FROM ${table} WHERE id = ? LIMIT 1`,
          [id],
        );
        if (Array.isArray(rows) && rows.length && rows[0]?.email) {
          return rows[0].email as string;
        }
      } catch {
        // テーブルが無い等 → 次候補へ
      }
    }
    return null;
  }
}
