import { PartialType } from '@nestjs/mapped-types';
import { CreateCompanyDto } from './create-company.dto';
import { Transform } from 'class-transformer';

const to01 = (value: any): 0 | 1 => {
  // hidden + checkbox の二重送信に対応
  const v = Array.isArray(value) ? value[value.length - 1] : value;
  return (v === '1' || v === 1 || v === true || v === 'on') ? 1 : 0;
};

export class UpdateCompanyDto extends PartialType(CreateCompanyDto) {
  @Transform(({ value }) => to01(value))
  is_active?: 0 | 1;
}
