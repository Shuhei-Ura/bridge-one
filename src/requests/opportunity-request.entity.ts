import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, Index, JoinColumn } from 'typeorm';
import { Company } from '../companies/company.entity';
import { User } from '../users/user.entity';
import { Opportunity } from '../opportunities/opportunity.entity';
import { Talent } from '../talents/talent.entity';

import { REQUEST_STATUS, type RequestStatus } from './request-status';

@Entity({ name: 'opportunity_requests' })
@Index('idx_or_from', ['from_company_id','status','created_at'])
@Index('idx_or_to', ['to_company_id','status','created_at'])
@Index('idx_or_opp', ['opportunity_id'])
@Index('idx_or_offered', ['offered_talent_id'])
export class OpportunityRequest {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'bigint' }) from_company_id: string;   // SESのみ（DBトリガーで検証）
  @Column({ type: 'bigint' }) from_user_id: string;
  @Column({ type: 'bigint' }) to_company_id: string;     // ← 案件の会社。トリガーでセット
  @Column({ type: 'bigint' }) opportunity_id: string;    // エンド案件
  @Column({ type: 'bigint' }) offered_talent_id: string; // 自社要員

  @ManyToOne(() => Company, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'from_company_id' })
  fromCompany: Company;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'from_user_id' })
  fromUser: User;

  @ManyToOne(() => Company, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'to_company_id' })
  toCompany: Company;

  @ManyToOne(() => Opportunity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'opportunity_id' })
  opportunity: Opportunity;

  @ManyToOne(() => Talent, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'offered_talent_id' })
  offeredTalent: Talent;

  @Column({ type: 'text', name: 'message_text' })
  message_text: string;

  @Column({ type: 'enum', enum: REQUEST_STATUS, default: 'pending' })
  status: RequestStatus;

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ type: 'datetime', name: 'updated_at' })
  updated_at: Date;
}