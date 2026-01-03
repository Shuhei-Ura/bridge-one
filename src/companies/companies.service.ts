import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from './company.entity';

@Injectable()
export class CompaniesService {
  constructor(
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
  ) {}

  /**
   * IDで会社を取得
   */
  async findById(id: string): Promise<Company> {
    const company = await this.companyRepo.findOne({
      where: { id },
    });
    if (!company) throw new NotFoundException(`Company ${id} not found`);
    return company;
  }

  /**
   * 会社一覧（管理画面などで使用予定）
   */
  async findAll(): Promise<Company[]> {
    return this.companyRepo.find({ order: { id: 'ASC' } });
  }

  /**
   * 新規作成
   */
  async create(data: Partial<Company>): Promise<Company> {
    const entity = this.companyRepo.create(data);
    return await this.companyRepo.save(entity);
  }

  /**
   * 更新
   */
  async update(id: string, data: Partial<Company>): Promise<Company> {
    const company = await this.findById(id);
    Object.assign(company, data);
    return await this.companyRepo.save(company);
  }
}
