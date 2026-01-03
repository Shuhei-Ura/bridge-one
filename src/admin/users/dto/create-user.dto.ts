import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength, IsInt } from 'class-validator';
import { Transform } from 'class-transformer';
import { Match } from '../../../common/validators/match.decorator';


const to01 = (v: any): 0|1 => (Array.isArray(v) ? v[v.length-1] : v) === '1' ? 1 : 0;

export class CreateUserDto {
  @IsNotEmpty() @IsString() @MaxLength(255)
  name!: string;

  @IsNotEmpty() @IsEmail() @MaxLength(255)
  email!: string;

  @Transform(({ value }) => String(value).toLowerCase())
  @IsIn(['admin', 'manager', 'member'])
  role!: 'admin' | 'manager' | 'member';

  @Transform(({ value }) => to01(value))
  @IsIn([0,1] as const)
  is_active?: 0 | 1;

  // ▼ パスワード（必須）
  @IsNotEmpty() @IsString() @MinLength(8) @MaxLength(72)
  password!: string;

  @IsNotEmpty() @IsString() @MinLength(8) @MaxLength(72)
  @Match('password', { message: '確認用パスワードが一致しません' })
  password_confirm!: string;

  @IsOptional()
  @IsInt()
  @Transform(({ value }) => value == null || value === '' ? undefined : Number(value))
  company_id?: number; // ← ルートから上書きする前提
}
