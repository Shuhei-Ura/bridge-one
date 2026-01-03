// src/talents/talent.entity.ts
import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn,
  Index, JoinColumn
} from 'typeorm';
import { Company } from '../companies/company.entity';
import { WORK_STYLES, type WorkStyle, TALENT_STATUSES, type TalentStatus } from '../common/enums';

@Entity({ name: 'talents' })

/**
 * ✅ 代表的な検索パターンに最適化した複合インデックス（2本）
 *  - 自社一覧/検索（company_id を必ず付ける場合）
 *  - 他社横断検索（company_id 条件なしの場合）
 */
@Index('idx_talents_search_by_company', ['company_id','role','prefecture','work_style_level','desired_rate','status_level'])
@Index('idx_talents_search_global',  ['role','prefecture','work_style_level','desired_rate'])

/** ✅ 単体・補助系 */
@Index('idx_talents_age', ['age'])
@Index('idx_talents_desired_rate', ['desired_rate'])
@Index('idx_talents_available', ['available_from'])

/** ✅ FULLTEXT（サマリの技術検索）
 *  MySQL 8系前提。N-gram等のパーサを使う場合はマイグレーションで作成推奨。
 */
@Index('ft_talents_summary_text', ['summary_text'], { fulltext: true })

export class Talent {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'bigint' })
  company_id: string;

  @ManyToOne(() => Company, c => c.talents, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'company_id' })
  company: Company;

  /** 社内向けの本名 */
  @Column({ type: 'varchar', length: 100 })
  name: string;

  /** 外部公開用の管理名（イニシャル等） */
  @Column({ type: 'varchar', length: 255, name: 'internal_name' })
  internal_name: string;

  /** 年齢（任意） */
  @Column({ type: 'int', nullable: true })
  age?: number;

  /** 希望単価（万円） */
  @Column({ type: 'int', nullable: true })
  desired_rate?: number;

  /** ロール（pg/se/pmo など自由文言） */
  @Column({ type: 'varchar', length: 100 })
  role: string;

  /** 希望案件（自由表記） */
  @Column({ type: 'varchar', length: 255, nullable: true })
  hope?: string | null;

  /** 都道府県（文字列で保持） */
  @Column({ type: 'varchar', length: 50 })
  prefecture: string;

  /** 地域（任意：那覇/首都圏など） */
  @Column({ type: 'varchar', length: 100, nullable: true })
  area?: string;

  /** ワークスタイル（アプリが保存） */
  @Column({ type: 'enum', enum: WORK_STYLES, nullable: false, default: 'remote' })
  work_style: WorkStyle;

  /** ワークスタイルレベル：1=remote, 2=hybrid, 3=onsite（DB生成列） */
  @Column({
    type: 'tinyint',
    asExpression: `
      CASE work_style
        WHEN 'onsite' THEN 3
        WHEN 'hybrid' THEN 2
        ELSE 1
      END
    `,
    generatedType: 'STORED',
  })
  work_style_level: number;

  /** 参画開始日（任意） */
  @Column({ type: 'date', nullable: true })
  available_from?: string;

  /** サマリ（技術キーワードを含める） */
  @Column({ type: 'text', nullable: true, name: 'summary_text' })
  summary_text?: string;

  /** 旧仕様互換：スキルシートURL（talent_documents運用なら nullable 推奨） */
  @Column({ type: 'text', name: 'skill_sheet_url', nullable: true })
  skill_sheet_url: string | null;

  @Column({ type: 'varchar', length: 512, nullable: true })
  skill_sheet_file_path: string | null;

  @Column({ type: 'varchar', length: 512, nullable: true })
  portfolio_file_path: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  skill_sheet_pdf_path?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  portfolio_pdf_path?: string | null;

  /** ステータス（人が設定） */
  @Column({ type: 'enum', enum: TALENT_STATUSES, default: 'marketing' })
  status: TalentStatus;

  /** ステータスレベル：1=marketing,2=interview,3=working,4=left（DB生成列） */
  @Column({
    type: 'tinyint',
    asExpression: `
      CASE status
        WHEN 'marketing' THEN 1
        WHEN 'interview' THEN 2
        WHEN 'working' THEN 3
        WHEN 'left' THEN 4
      END
    `,
    generatedType: 'STORED',
  })
  status_level: number;

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ type: 'datetime', name: 'updated_at' })
  updated_at: Date;
}

