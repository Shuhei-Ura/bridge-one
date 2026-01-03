import { IsEnum, IsInt, IsOptional, IsString, Min, Max } from 'class-validator';
import { WORK_STYLES } from '../../common/enums';

export class CompanySearchTalentDto {
  // company_id はパスから取得（:companyId）→ サービスに引数で渡す想定

  @IsOptional() @IsString()
  nameStartsWith?: string; // 前方一致

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

  /** 1=remote / 2=hybrid / 3=onsite */
  @IsOptional() @IsInt() @Min(1) @Max(3)
  minWorkStyleLevel?: number;

  /** “面談まで”=2 など */
  @IsOptional() @IsInt() @Min(1) @Max(4)
  maxStatusLevel?: number;

  @IsOptional() @IsString()
  keywords?: string; // MATCH AGAINST 用（例: "+react +typescript"）

  @IsOptional() @IsInt() @Min(0)
  page?: number;

  @IsOptional() @IsInt() @Min(1) @Max(200)
  pageSize?: number;
}
