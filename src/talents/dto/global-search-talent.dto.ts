import { IsEnum, IsInt, IsOptional, IsString, Min, Max } from 'class-validator';

export class GlobalSearchTalentDto {
  // --- 既存（互換維持） ---

  @IsOptional() @IsInt() @Min(15) @Max(80)
  minAge?: number;

  @IsOptional() @IsInt() @Min(15) @Max(80)
  maxAge?: number;

  @IsOptional() @IsInt() @Min(10) @Max(200)
  maxDesiredRate?: number;

  @IsOptional() @IsString()
  role?: string;

  @IsOptional() @IsString()
  prefecture?: string;

  /** 常駐→フルリモートの3段階などの想定 */
  @IsOptional() @IsInt() @Min(0) @Max(3)
  minWorkStyleLevel?: number;

  /** FULLTEXT検索などで使うキーワード（必要なら継続） */
  @IsOptional() @IsString()
  keywords?: string;

  @IsOptional() @IsInt() @Min(0)
  page?: number;  // 0-based

  @IsOptional() @IsInt() @Min(1) @Max(200)
  pageSize?: number;

  // --- ▼ 今回の UI 用 5条件（新規） ▼ ---

  /** 年齢（以下） */
  @IsOptional() @IsInt() @Min(15) @Max(80)
  ageMax?: number;

  /** 単価（下限） */
  @IsOptional() @IsInt() @Min(1) @Max(999)
  priceMin?: number;

  /** 単価（上限） */
  @IsOptional() @IsInt() @Min(1) @Max(999)
  priceMax?: number;

  /** 働き方（以下）: 例) 0=常駐〜2=フルリモート */
  @IsOptional() @IsInt() @Min(0) @Max(3)
  workStyleMax?: number;

  /** サマリ（部分一致） */
  @IsOptional() @IsString()
  summaryQ?: string;

  @IsOptional()
  @IsString()
  excludeCompanyId?: string; // 自社IDなど、除外したい company_id
}
