import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import * as path from 'path';
import * as fs from 'fs';
import { Talent } from '../talent.entity';

import { CreateTalentDto } from '../dto/create-talent.dto';
import { UpdateTalentDto } from '../dto/update-talent.dto';
import { CompanySearchTalentDto } from '../dto/company-search-talent.dto';
import { StorageService } from '../../storage/storage.service';
import type { File as MulterFile } from 'multer';

// talents 専用の物理パス解決のみ使う（公開URL化は StorageService 由来に統一）
import { talentsAbsPath } from '../../config/uploads';

type CreateUpdateOpts = {
  skillSheetFile?: MulterFile;   // name="skill_sheet_file"
  portfolioFile?: MulterFile;    // name="portfolio_file"
};

function isPdfName(name?: string | null) {
  return !!name && /\.pdf(\?|$)/i.test(name);
}

@Injectable()
export class CompanyTalentService {
  constructor(
    @InjectRepository(Talent)
    private readonly repo: Repository<Talent>,
    private readonly storage: StorageService,
  ) {}

  // ========== CRUD（自社のみ） ==========
  async create(companyId: string, dto: CreateTalentDto, opts: CreateUpdateOpts = {}) {
    const entity = this.repo.create({
      ...dto,
      company_id: companyId,
    });

    // URL運用：URL自体がPDFならPDFパスも埋める（外部URLはそのまま保持）
    if (entity.skill_sheet_url && isPdfName(entity.skill_sheet_url)) {
      (entity as any).skill_sheet_pdf_path = entity.skill_sheet_url;
    }

    // ---- スキルシート（ファイル） ----
    if (opts.skillSheetFile?.buffer && opts.skillSheetFile.originalname) {
      // talents 直下に保存（StorageService を使う。subdir は 'talents' 固定）
      const saved = this.storage.saveToUploads('talents', opts.skillSheetFile.buffer, opts.skillSheetFile.originalname);
      entity.skill_sheet_file_path = saved.url; // 例: /uploads/talents/abc.xlsx

      if (isPdfName(opts.skillSheetFile.originalname)) {
        // もともとPDFならそのまま公開URLを採用
        (entity as any).skill_sheet_pdf_path = saved.url; // /uploads/talents/xxx.pdf
      } else {
        // 非PDF → talents 直下で PDF 化（物理 → 公開URL）
        try {
          // 物理の入力元（talents 直下にあるはずなので basename でOK）
          const srcAbs = talentsAbsPath(path.basename(saved.url)); // .../public/uploads/talents/abc.xlsx
          // ★ ここが重要：第2引数は 'talents'（サブディレクトリ名）を渡す
          const pdfUrl = await this.storage.convertOfficeToPdf(srcAbs, 'talents');
          (entity as any).skill_sheet_pdf_path = pdfUrl; // /uploads/talents/abc.pdf を期待
        } catch (e) {
          console.warn('skill sheet PDF convert failed:', (e as Error)?.message ?? e);
        }
      }
    }

    // ---- ポートフォリオ（任意） ----
    if (opts.portfolioFile?.buffer && opts.portfolioFile.originalname) {
      const saved = this.storage.saveToUploads('talents', opts.portfolioFile.buffer, opts.portfolioFile.originalname);
      entity.portfolio_file_path = saved.url; // /uploads/talents/...

      if (isPdfName(opts.portfolioFile.originalname)) {
        (entity as any).portfolio_pdf_path = saved.url;
      } else {
        try {
          const srcAbs = talentsAbsPath(path.basename(saved.url));
          // ★ ここも同様に 'talents'
          const pdfUrl = await this.storage.convertOfficeToPdf(srcAbs, 'talents');
          (entity as any).portfolio_pdf_path = pdfUrl;
        } catch (e) {
          console.warn('portfolio PDF convert failed:', (e as Error)?.message ?? e);
        }
      }
    }

    return await this.repo.save(entity);
  }

  async update(companyId: string, id: string, dto: UpdateTalentDto, opts: CreateUpdateOpts = {}) {
    const talent = await this.repo.findOneByOrFail({ id, company_id: companyId });

    Object.assign(talent, dto);

    // URL変更：URL自体がPDFならPDFパスも更新（非PDF URL は既存PDF維持）
    if (dto.skill_sheet_url !== undefined && isPdfName(dto.skill_sheet_url)) {
      (talent as any).skill_sheet_pdf_path = dto.skill_sheet_url!;
    }

    // ---- スキルシート（差し替え）----
    if (opts.skillSheetFile?.buffer && opts.skillSheetFile.originalname) {
      try { await (this.storage as any)?.deleteIfLocal?.(talent.skill_sheet_file_path); } catch {}
      const saved = this.storage.saveToUploads('talents', opts.skillSheetFile.buffer, opts.skillSheetFile.originalname);
      talent.skill_sheet_file_path = saved.url;

      if (isPdfName(opts.skillSheetFile.originalname)) {
        (talent as any).skill_sheet_pdf_path = saved.url;
      } else {
        try {
          const srcAbs = talentsAbsPath(path.basename(saved.url));
          // ★ ここも 'talents'
          const pdfUrl = await this.storage.convertOfficeToPdf(srcAbs, 'talents');
          (talent as any).skill_sheet_pdf_path = pdfUrl;
        } catch (e) {
          console.warn('skill sheet PDF convert failed:', (e as Error)?.message ?? e);
        }
      }
    }

    // ---- ポートフォリオ（差し替え）----
    if (opts.portfolioFile?.buffer && opts.portfolioFile.originalname) {
      try { await (this.storage as any)?.deleteIfLocal?.(talent.portfolio_file_path); } catch {}
      const saved = this.storage.saveToUploads('talents', opts.portfolioFile.buffer, opts.portfolioFile.originalname);
      talent.portfolio_file_path = saved.url;

      if (isPdfName(opts.portfolioFile.originalname)) {
        (talent as any).portfolio_pdf_path = saved.url;
      } else {
        try {
          const srcAbs = talentsAbsPath(path.basename(saved.url));
          // ★ ここも 'talents'
          const pdfUrl = await this.storage.convertOfficeToPdf(srcAbs, 'talents');
          (talent as any).portfolio_pdf_path = pdfUrl;
        } catch (e) {
          console.warn('portfolio PDF convert failed:', (e as Error)?.message ?? e);
        }
      }
    }

    return await this.repo.save(talent);
  }

  async remove(companyId: string, id: string) {
    const t = await this.repo.findOneBy({ id, company_id: companyId });
    if (t) {
      try { await (this.storage as any)?.deleteIfLocal?.(t.skill_sheet_file_path); } catch {}
      try { await (this.storage as any)?.deleteIfLocal?.(t.portfolio_file_path); } catch {}
      try { await (this.storage as any)?.deleteIfLocal?.((t as any).skill_sheet_pdf_path); } catch {}
      try { await (this.storage as any)?.deleteIfLocal?.((t as any).portfolio_pdf_path); } catch {}
    }
    await this.repo.delete({ id, company_id: companyId });
  }

  async findOne(companyId: string, id: string) {
    return this.repo.findOneByOrFail({ id, company_id: companyId });
  }

  // ========== 検索（自社） ==========
  async search(companyId: string, q: CompanySearchTalentDto) {
    const page = q.page ?? 0;
    const pageSize = q.pageSize ?? 50;

    const qb = this.repo
      .createQueryBuilder('t')
      .where('t.company_id = :cid', { cid: companyId });

    this.applyCompanyFilters(qb, q);

    qb.orderBy('t.available_from', 'ASC')
      .addOrderBy('t.desired_rate', 'ASC')
      .addOrderBy('t.id', 'ASC')
      .take(pageSize)
      .skip(page * pageSize);

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, pageSize };
  }

  // ----- 追加フィルタ -----
  private applyCompanyFilters(qb: SelectQueryBuilder<Talent>, q: any) {
    const name       = typeof q.name === 'string' ? q.name.trim() : '';
    const summary    = typeof q.summary === 'string' ? q.summary.trim() : '';
    const prefecture = typeof q.prefecture === 'string' ? q.prefecture.trim() : '';
    const status     = typeof q.status === 'string' ? q.status.trim() : '';

    const maxAge  = q.maxAge  !== undefined && q.maxAge  !== '' ? Number(q.maxAge)  : undefined;
    const maxRate = q.maxDesiredRate !== undefined && q.maxDesiredRate !== '' ? Number(q.maxDesiredRate) : undefined;

    if (name) {
      qb.andWhere('t.name LIKE :name', { name: `%${name}%` });
    }
    if (summary) {
      qb.andWhere('t.summary_text LIKE :summary', { summary: `%${summary}%` });
    }
    if (Number.isFinite(maxAge)) {
      qb.andWhere('t.age <= :maxAge', { maxAge });
    }
    if (Number.isFinite(maxRate)) {
      qb.andWhere('t.desired_rate <= :maxRate', { maxRate });
    }
    if (prefecture) {
      qb.andWhere('t.prefecture LIKE :pref', { pref: `${prefecture}%` });
    }
    if (status) {
      qb.andWhere('t.status = :status', { status });
    }
  }
}
