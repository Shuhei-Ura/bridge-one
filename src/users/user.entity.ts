import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, Index, JoinColumn } from 'typeorm';
import { Company } from '../companies/company.entity';
import { RelationId } from 'typeorm';

export type UserRole = 'admin' | 'manager' | 'member';

@Entity({ name: 'users' })
@Index('uk_users_email', ['email'], { unique: true })
@Index('idx_users_company', ['company'])
export class User {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @ManyToOne(() => Company, c => c.users, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @RelationId((u: User) => u.company)
  readonly company_id!: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Column({ type: 'enum', enum: ['admin','manager', 'member',], default: 'member' })
  role: UserRole;

  @Column({ type: 'tinyint', width: 1, default: 1 })
  is_active: boolean;

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ type: 'datetime', name: 'updated_at' })
  updated_at: Date;

  // 既存ログイン構成との整合のため:
  @Column({ type: 'varchar', length: 255, name: 'password_hash', nullable: true, select: false })
  passwordHash?: string;
}