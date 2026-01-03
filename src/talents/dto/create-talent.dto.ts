import { IsEnum, IsInt, IsOptional, IsString, IsDateString, Max, Min, Length } from 'class-validator';
import { TALENT_STATUSES, WORK_STYLES, type TalentStatus, type WorkStyle } from '../../common/enums';
import { Type } from 'class-transformer';

export class CreateTalentDto {

  @IsString() @Length(1,100)
  name!: string;

  @IsString() @Length(1,255)
  internal_name!: string;

  @Type(() => Number) @IsInt() @Min(15) @Max(80)
  age?: number;

  @Type(() => Number) @IsInt() @Min(10) @Max(200) // 万円
  desired_rate?: number;

  @IsString() @Length(1,100)
  role!: string;

  @IsOptional() @IsString() @Length(0,255)
  hope?: string;

  @IsString() @Length(1,50)
  prefecture!: string;

  @IsOptional() @IsString() @Length(0,100)
  area?: string;

  @IsEnum(WORK_STYLES)
  work_style!: WorkStyle;

  @IsOptional() @IsDateString()
  available_from?: string;

  @IsOptional() @IsString()
  summary_text?: string;

  /**
   * スキルシートは URL または ファイルのどちらか。
   * ファイルは multipart(multer) 側で受けるので DTO には入れない。
   * ファイルがアップロードされた場合は Service 層で URL よりファイルが優先される。
   */
  @IsOptional() @IsString()
  skill_sheet_url?: string;

  @IsEnum(TALENT_STATUSES)
  status!: TalentStatus;
}
