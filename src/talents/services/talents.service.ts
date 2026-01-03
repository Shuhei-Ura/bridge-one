import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Talent } from '../talent.entity';
import { Repository } from 'typeorm';
import { CreateTalentDto } from '../dto/create-talent.dto';
import { UpdateTalentDto } from '../dto/update-talent.dto';
import { applyCoreFilters, applyPaging } from '../common/talent.search.builder';

@Injectable()
export class TalentsService {
  constructor(@InjectRepository(Talent) private readonly repo: Repository<Talent>) {}

  async create(companyId: string, dto: CreateTalentDto) {
    const t = this.repo.create({ ...dto, company_id: companyId });
    return this.repo.save(t);
  }

  async update(id: string, companyId: string, dto: UpdateTalentDto) {
    await this.repo.update({ id, company_id: companyId }, dto);
    return this.repo.findOneByOrFail({ id, company_id: companyId });
  }

  async remove(id: string, companyId: string) {
    await this.repo.delete({ id, company_id: companyId });
  }

  /** 自社検索（companyId で絞る） */
  async searchCompany(companyId: string, p: {
    nameStartsWith?: string;
    minAge?: number; maxAge?: number;
    maxDesiredRate?: number;
    role?: string; prefecture?: string;
    minWorkStyleLevel?: number;
    maxStatusLevel?: number;
    keywords?: string;
    page?: number; pageSize?: number;
  }) {
    const qb = this.repo.createQueryBuilder('t')
      .where('t.company_id = :cid', { cid: companyId });

    if (p.maxStatusLevel) qb.andWhere('t.status_level <= :s', { s: p.maxStatusLevel });
    if (p.nameStartsWith) qb.andWhere('t.name LIKE :nm', { nm: `${p.nameStartsWith}%` });

    applyCoreFilters(qb, {
      role: p.role, prefecture: p.prefecture,
      minWorkStyleLevel: p.minWorkStyleLevel,
      maxDesiredRate: p.maxDesiredRate,
      minAge: p.minAge, maxAge: p.maxAge,
      keywords: p.keywords,
    });

    qb.orderBy('t.available_from', 'ASC').addOrderBy('t.desired_rate', 'ASC');
    applyPaging(qb, p);
    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  /** グローバル検索（company指定なし） */
  async searchGlobal(p: {
    minAge?: number; maxAge?: number;
    maxDesiredRate?: number;
    role?: string; prefecture?: string;
    minWorkStyleLevel?: number;
    keywords?: string;
    page?: number; pageSize?: number;
  }) {
    const qb = this.repo.createQueryBuilder('t')
      .where('t.status <> :left', { left: 'left' }); // 例：離脱は既定で除外

    applyCoreFilters(qb, {
      role: p.role, prefecture: p.prefecture,
      minWorkStyleLevel: p.minWorkStyleLevel,
      maxDesiredRate: p.maxDesiredRate,
      minAge: p.minAge, maxAge: p.maxAge,
      keywords: p.keywords,
    });

    qb.orderBy('t.available_from', 'ASC').addOrderBy('t.desired_rate', 'ASC');
    applyPaging(qb, p);
    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }
}
