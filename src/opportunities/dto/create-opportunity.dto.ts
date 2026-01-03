import { IsBoolean, IsDateString, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Length, Max, Min } from 'class-validator';
import { WORK_STYLES, type WorkStyle } from '../../common/enums';

export class CreateOpportunityDto {
  @IsString()
  @Length(1, 200)
  title!: string;

  @IsString()
  @Length(1, 1000)
  summary!: string;

  @IsString()
  @Length(1, 100)
  role!: string;

  @IsOptional()
  @IsString()
  @Length(0, 50)
  prefecture?: string;

  @IsEnum(WORK_STYLES)
  work_style!: WorkStyle;

  @IsOptional()
  @IsDateString()
  start_date?: string;

  @IsOptional()
  @IsDateString()
  end_date?: string;

  @IsOptional()
  @IsString()
  @Length(0, 50)
  price_range?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(120)
  max_age?: number;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
