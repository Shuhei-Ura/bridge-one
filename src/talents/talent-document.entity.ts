// src/talents/talent-document.entity.ts
import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
  CreateDateColumn, UpdateDateColumn, Index, Unique
} from 'typeorm';
import { Talent } from './talent.entity';
import {
  TALENT_DOC_TYPES, type TalentDocType,
  STORAGE_TYPES, type StorageType,
  PREVIEW_TYPES, type PreviewType
} from '../common/enums';

@Entity({ name: 'talent_documents' })
@Index('idx_td_talent', ['talent_id'])
@Index('idx_td_current', ['talent_id','doc_type','is_current'])
@Index('idx_td_doc_type', ['doc_type'])
@Unique('uq_td_talent_version', ['talent_id','doc_type','version'])
@Unique('uq_td_share_token', ['share_token'])
export class TalentDocument {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  /** 親: talents.id */
  @Column({ type: 'bigint' })
  talent_id: string;

  @ManyToOne(() => Talent, t => (t as any), { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'talent_id' })
  talent: Talent;

  /** 種別: スキルシート/ポートフォリオ/資格など */
  @Column({ type: 'enum', enum: TALENT_DOC_TYPES, default: 'skill_sheet' })
  doc_type: TalentDocType;

  /** 実体の保存方法 */
  @Column({ type: 'enum', enum: STORAGE_TYPES })
  storage_type: StorageType;

  /** URL保存（storage_type='url' or 'gdrive'） */
  @Column({ type: 'text', nullable: true })
  url: string | null;

  /** サーバー内の保存パス（storage_type='upload'） */
  @Column({ type: 'varchar', length: 512, nullable: true })
  file_path: string | null;

  /** 元ファイル名等のメタ */
  @Column({ type: 'varchar', length: 255, nullable: true })
  original_name: string | null;

  @Column({ type: 'varchar', length: 127, nullable: true })
  mime_type: string | null;

  @Column({ type: 'bigint', nullable: true })
  size_bytes: string | null;

  /** 64桁（SHA-256等） */
  @Column({ type: 'char', length: 64, nullable: true })
  hash_checksum: string | null;

  /** バージョン（同一 doc_type で昇順管理） */
  @Column({ type: 'int', default: 1 })
  version: number;

  /** 現行版フラグ（種類ごとに1つとは限らない運用も可） */
  @Column({ type: 'tinyint', width: 1, default: 1 })
  is_current: number; // boolean代わり（MySQL系互換）

  /** 事前生成/変換されたプレビューの種別 */
  @Column({ type: 'enum', enum: PREVIEW_TYPES, default: 'none' })
  preview_type: PreviewType;

  /** プレビューの保存パス（PDFやサムネ等） */
  @Column({ type: 'varchar', length: 512, nullable: true })
  preview_path: string | null;

  /** 共有リンク系 */
  @Column({ type: 'char', length: 32, nullable: true })
  share_token: string | null;

  @Column({ type: 'datetime', nullable: true })
  share_expires_at: Date | null;

  /** 共有オプション（DL可否・ウォーターマーク等） */
  @Column({ type: 'json', nullable: true })
  share_options: any | null;

  /** 登録者（必要なら users へFK化） */
  @Column({ type: 'bigint', nullable: true })
  created_by: string | null;

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ type: 'datetime', name: 'updated_at' })
  updated_at: Date;
}
