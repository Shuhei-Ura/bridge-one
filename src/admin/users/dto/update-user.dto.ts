import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';
import { Match } from '../../../common/validators/match.decorator';
import { IsEmail, IsIn, IsOptional, IsString, MinLength, MaxLength, IsInt } from 'class-validator';
import { Transform } from 'class-transformer';


const to01 = (v: any): 0|1 => {
  const x = Array.isArray(v) ? v[v.length - 1] : v;
  return (x === '1' || x === 1 || x === true || x === 'on') ? 1 : 0;
};

const emptyToUndefTrim = ({ value }: { value: any }) =>
  (typeof value === 'string' ? value.trim() : value) === '' ? undefined : (typeof value === 'string' ? value.trim() : value);

export class UpdateUserDto extends PartialType(CreateUserDto) {
  
  @Transform(({ value }) => to01(value))
  @IsIn([0,1] as const)
  is_active?: 0|1;

  // 編集ではパスワードは「空なら変更なし」「入れたら更新」
  @Transform(emptyToUndefTrim) @IsOptional() @IsString() @MinLength(8) @MaxLength(72)
  password?: string;

  @Transform(emptyToUndefTrim) @IsOptional() @IsString() @MinLength(8) @MaxLength(72)
  @Match('password', { message: '確認用パスワードが一致しません' })
  password_confirm?: string;

  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsEmail()  email?: string;
  @IsOptional() @IsIn(['admin','member']) role?: 'admin'|'member';

  @IsOptional()
  @IsInt()
  @Transform(({ value }) => value == null || value === '' ? undefined : Number(value))
  company_id?: number; // 受けるが使わない
}