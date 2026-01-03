import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Opportunity } from './opportunity.entity';
import { CreateOpportunityDto } from './dto/create-opportunity.dto';
import { CompaniesService } from '../companies/companies.service';
// 既存 import に追加
import { FindOptionsWhere } from 'typeorm';

@Injectable()
export class OpportunitiesService {
  constructor(
    @InjectRepository(Opportunity) private readonly oppRepo: Repository<Opportunity>,
    private readonly companies: CompaniesService,
  ) {}

  async assertCompanyExists(companyId: string) {
    const company = await this.companies.findById(companyId);
    if (!company) throw new NotFoundException('Company not found');
    return company;
  }

  async create(companyId: string, dto: CreateOpportunityDto) {
    await this.assertCompanyExists(companyId);

    const opp = this.oppRepo.create({
      ...dto,
      company_id: companyId,
      is_active: dto.is_active ?? true,
    });

    // start/end の前後関係を一応チェック（任意）
    if (opp.start_date && opp.end_date && opp.start_date > opp.end_date) {
      throw new ForbiddenException('開始日は終了日より前である必要があります');
    }

    return await this.oppRepo.save(opp);
  }
  
    async listForCompany(
    companyId: string,
    opts: { page?: number; perPage?: number; is_active?: '1' | '0' | undefined; q?: string | undefined } = {},
    ) {
    await this.assertCompanyExists(companyId);

    const page = Math.max(1, Number(opts.page ?? 1));
    const perPage = Math.min(100, Number(opts.perPage ?? 30));

    const where: FindOptionsWhere<Opportunity> = { company_id: companyId as any };
    if (opts.is_active === '1') where.is_active = true;
    if (opts.is_active === '0') where.is_active = false;

    // ざっくり検索（role / title / summary のいずれかに含む）
    const qb = this.oppRepo.createQueryBuilder('o')
        .where('o.company_id = :cid', { cid: companyId })
        .orderBy('o.created_at', 'DESC')
        .skip((page - 1) * perPage)
        .take(perPage);

    if (opts.is_active === '1') qb.andWhere('o.is_active = 1');
    if (opts.is_active === '0') qb.andWhere('o.is_active = 0');

    if (opts.q) {
        qb.andWhere('(o.role LIKE :q OR o.title LIKE :q OR o.summary LIKE :q)', { q: `%${opts.q}%` });
    }

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, perPage, pages: Math.max(1, Math.ceil(total / perPage)) };
    }

    async findOneByCompany(companyId: string, id: string) {
    await this.assertCompanyExists(companyId);
    const opp = await this.oppRepo.findOne({ where: { id: id as any, company_id: companyId as any } });
    if (!opp) throw new NotFoundException('Opportunity not found');
    return opp;
    }
}
