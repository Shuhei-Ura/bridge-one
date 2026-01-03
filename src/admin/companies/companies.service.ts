// src/admin/companies/companies.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from '../../companies/company.entity';
import { CompanyListQueryDto } from './dto/company-list-query.dto';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';

@Injectable()
export class CompaniesService {
  constructor(
    @InjectRepository(Company)
    private readonly repo: Repository<Company>,
  ) {}

  async list(qs: CompanyListQueryDto) {
    const page = Math.max(1, Number(qs.page ?? 1));
    const perPage = Math.max(1, Number(qs.perPage ?? 10));

    const qb = this.repo.createQueryBuilder('c');

    if (qs.q?.trim()) qb.andWhere('c.name LIKE :q', { q: `%${qs.q.trim()}%` });
    if (qs.type && qs.type !== 'all') {
      qb.andWhere('c.company_type = :type', { type: String(qs.type).toLowerCase() });
    }
    if (qs.active && qs.active !== 'all') {
      qb.andWhere('c.is_active = :act', { act: qs.active === '1' ? 1 : 0 });
    }

    qb.orderBy('c.updated_at', 'DESC')
      .addOrderBy('c.id', 'DESC')
      .skip((page - 1) * perPage)
      .take(perPage);

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, perPage };
  }

  async findOne(id: number) {
    return this.repo.findOne({ where: { id } as any });
  }

  async create(dto: CreateCompanyDto) {
    // is_active は boolean に寄せる
    const entity = this.repo.create({
      name: dto.name,
      domain: dto.domain ?? null,
      company_type: dto.company_type,        // 'ses' | 'end'
      is_active: !!dto.is_active,            // 1/0 → true/false
    });
    return this.repo.save(entity);
  }

  async update(id: number, dto: UpdateCompanyDto) {
    // 直接 update でも OK だが、念のため存在確認したいなら findOne → merge → save でも可
    const payload: Partial<Company> = {
      name: dto.name,
      domain: dto.domain ?? null,
      company_type: dto.company_type as any,
      is_active: dto.is_active != null ? !!dto.is_active : undefined,
    };
    await this.repo.update({ id } as any, payload);
    return this.findOne(id);
  }

  async toggleActive(id: number) {
    const current = await this.findOne(id);
    if (!current) return;
    await this.repo.update({ id } as any, { is_active: !current.is_active });
    return this.findOne(id);
  }
}
