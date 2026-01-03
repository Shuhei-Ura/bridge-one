import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User } from '../../users/user.entity';
import { Company } from '../../companies/company.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Company])],
  controllers: [UsersController],       // ← 旧「ユーザー管理」を使わないならリンクだけ外せばOK
  providers: [UsersService],
  exports: [UsersService],              // ★ これ必須（他モジュールから見えるように）
})
export class UsersModule {}
