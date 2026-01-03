import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne,
  CreateDateColumn, UpdateDateColumn, Index, JoinColumn
} from 'typeorm';
import { Company } from '../companies/company.entity';
import { WORK_STYLES, type WorkStyle } from '../common/enums';

@Entity({ name: 'opportunities' })
@Index('idx_opp_company', ['company_id','is_active'])
@Index('idx_opp_search', ['role','prefecture','work_style','start_date'])
export class Opportunity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'bigint' })
  company_id: string;

  @ManyToOne(() => Company, c => c.opportunities, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'varchar', length: 1000 })
  summary: string;

  @Column({ type: 'varchar', length: 100 })
  role: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  prefecture?: string;

  @Column({ type: 'enum', enum: WORK_STYLES })
  work_style: WorkStyle;

  @Column({ type: 'date', nullable: true })
  start_date?: string;

  @Column({ type: 'date', nullable: true })
  end_date?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  price_range?: string;

  // ← contract_type は削除済み

  @Column({ type: 'tinyint', width: 1, default: 1 })
  is_active: boolean;

  // 追加していた場合：希望上限年齢
  @Column({ type: 'int', nullable: true })
  max_age?: number;

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ type: 'datetime', name: 'updated_at' })
  updated_at: Date;
}