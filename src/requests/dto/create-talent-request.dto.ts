import { IsInt, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTalentRequestDto {
  @Type(() => Number)
  @IsInt()
  talent_id!: number;

  // ★ 追加：案件名
  @IsString()
  @IsNotEmpty({ message: '案件名は必須です' })
  @MinLength(2, { message: '案件名は2文字以上で入力してください' })
  @MaxLength(120, { message: '案件名は120文字以内で入力してください' })
  request_title!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(4000)
  message_text!: string;
}
