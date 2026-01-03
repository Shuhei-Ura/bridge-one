import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CompanyListQueryDto {
  @IsOptional() @IsString() q?: string;                  // 名前部分一致
  @IsOptional() @IsIn(['SES','END','all']) type?: 'SES'|'END'|'all';
  @IsOptional() @IsIn(['1','0','all']) active?: '1'|'0'|'all';

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) perPage?: number;
}