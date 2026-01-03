import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, Index } from 'typeorm';
import { User } from '../users/user.entity';
import { Talent } from '../talents/talent.entity';
import { Opportunity } from '../opportunities/opportunity.entity';

export type CompanyType = 'ses' | 'end';

@Entity({ name: 'companies' })
@Index('uk_companies_name', ['name'], { unique: true })
export class Company {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  domain?: string | null;   // ← null を許容

  @Column({ type: 'enum', enum: ['ses', 'end'], default: 'ses' })
  company_type: CompanyType;

  @Column({ type: 'tinyint', width: 1, default: 1 })
  is_active: boolean;

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ type: 'datetime', name: 'updated_at' })
  updated_at: Date;

  @OneToMany(() => User, u => u.company)
  users: User[];

  @OneToMany(() => Talent, t => t.company)
  talents: Talent[];

  @OneToMany(() => Opportunity, o => o.company)
  opportunities: Opportunity[];
}