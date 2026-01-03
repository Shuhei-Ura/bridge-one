import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { Company } from '../companies/company.entity';
import { UsersService } from './users.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, Company])],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}