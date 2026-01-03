import { IsEmail, IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UserListQueryDto {
  @IsOptional() @IsString() q?: string; // name/email 部分一致
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) companyId?: number;
  @IsOptional() @IsIn(['admin','member','all']) role?: 'admin'|'member'|'all';
  @IsOptional() @IsIn(['1','0','all']) active?: '1'|'0'|'all';

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) perPage?: number;
}

