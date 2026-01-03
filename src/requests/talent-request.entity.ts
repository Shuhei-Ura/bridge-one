// src/requests/talent-request.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  JoinColumn,
} from 'typeorm';
import { Company } from '../companies/company.entity';
import { User } from '../users/user.entity';
import { Talent } from '../talents/talent.entity';
import { REQUEST_STATUS, type RequestStatus } from './request-status';

@Entity({ name: 'talent_requests' })
@Index('idx_tr_from', ['from_company_id', 'status', 'created_at'])
@Index('idx_tr_to',   ['to_company_id',   'status', 'created_at'])
@Index('idx_tr_talent', ['talent_id'])
export class TalentRequest {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string; // BIGINTはJSで安全に扱うためstring運用

  // 送信元（自社）
  @Column({ type: 'bigint', nullable: false })
  from_company_id!: string;

  @Column({ type: 'bigint', nullable: false })
  from_user_id!: string;

  // 宛先会社（talents.company_id）。DBトリガで自動セットされるため、INSERT/UPDATE対象から外す
  @Column({ type: 'bigint', nullable: false, insert: false, update: false })
  to_company_id!: string;

  // 宛先要員
  @Column({ type: 'bigint', nullable: false })
  talent_id!: string;

  // リレーション（FKはDDL準拠。削除はRESTRICT）
  @ManyToOne(() => Company, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'from_company_id' })
  fromCompany!: Company;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'from_user_id' })
  fromUser!: User;

  @ManyToOne(() => Company, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'to_company_id' })
  toCompany!: Company;

  @ManyToOne(() => Talent, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'talent_id' })
  talent!: Talent;

  @Column({ type: 'varchar', length: 120, name: 'request_title', nullable: true })
  request_title: string | null;

  // 案件説明（自由文）
  @Column({ type: 'text', name: 'message_text', nullable: false })
  message_text!: string;

  // 'pending' | 'accepted' | 'declined' | 'expired'
  @Column({ type: 'enum', enum: REQUEST_STATUS, default: 'pending' })
  status!: RequestStatus;

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'datetime', name: 'updated_at' })
  updated_at!: Date;
}
