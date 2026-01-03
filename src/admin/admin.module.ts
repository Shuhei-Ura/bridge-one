import { Module } from '@nestjs/common';
import { CompaniesModule } from './companies/companies.module';
import { UsersModule } from './users/users.module';
import { CompanyUsersModule } from './company-users/company-users.module';

@Module({
  imports: [
    CompaniesModule,
    UsersModule,
    CompanyUsersModule, // ← 追加
  ],
})
export class AdminModule {}