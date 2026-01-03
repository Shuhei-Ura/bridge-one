// src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';

import { User } from '../users/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]), // ← Repository(User) を AuthService に提供
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService], // ← 他モジュールからも使えるように（必要なら）
})
export class AuthModule {}
