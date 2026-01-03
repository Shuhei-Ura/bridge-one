import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateCompanyDto {
  @IsNotEmpty() @IsString() @MaxLength(255)
  name!: string;

  // ← select の value は 'ses' / 'end'（小文字）で送る
  @Transform(({ value }) => value ? String(value).toLowerCase() : undefined)
  @IsIn(['ses', 'end'])
  company_type!: 'ses' | 'end';

  @IsOptional() @IsString() @MaxLength(255)
  domain?: string;

  // ← checkbox の '1' / undefined を 1/0 に正規化
  @Transform(({ value }) => (value === '1' || value === 1 || value === true ? 1 : 0))
  @IsIn([0, 1] as const)
  is_active?: 0 | 1;
}

