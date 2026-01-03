import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export enum RequestResponseAction {
  ACCEPT = 'accepted',
  DECLINE = 'declined',
}

export class RespondRequestDto {
  @IsEnum(RequestResponseAction)
  action!: RequestResponseAction; // 'accept' | 'decline'

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  message?: string;
}
