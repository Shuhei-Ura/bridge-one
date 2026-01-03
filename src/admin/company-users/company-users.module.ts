import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompanyUsersController } from './company-users.controller';
import { Company } from '../../companies/company.entity';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Company]),
    UsersModule, // ← これが一番大事：UsersService をここで見えるようにする
  ],
  controllers: [CompanyUsersController],
})
export class CompanyUsersModule {}