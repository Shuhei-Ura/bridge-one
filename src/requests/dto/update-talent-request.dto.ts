import { IsOptional, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateTalentRequestDto {
  // タイトル／本文はどちらか一方でも更新できるよう Optional に
  @IsOptional()
  @IsString()
  @MinLength(2, { message: '案件名は2文字以上で入力してください' })
  @MaxLength(120, { message: '案件名は120文字以内で入力してください' })
  request_title?: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(4000)
  message_text!: string;
}
