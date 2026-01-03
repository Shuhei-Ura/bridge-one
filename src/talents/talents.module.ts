import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Talent } from './talent.entity';
import { TalentDocument } from './talent-document.entity';

import { CompanyTalentService } from './services/company-talent.service';
import { CompanyTalentController } from './controllers/company-talent.controller'; // 使っていなければ外してOK
import { StorageModule } from '../storage/storage.module'; // StorageService 用

import { GlobalTalentService } from './services/global-talent.service';
import { GlobalTalentController } from './controllers/global-talent.controller';
import { TalentShowController } from './controllers/talent-show.controller';

// ※ もし repository 等の依存があればここで providers に追加 or
//    別モジュールから imports してください。
//    まずは最小で動かすために Service/Controller だけ束ねます。

@Module({
  imports: [
    TypeOrmModule.forFeature([Talent, TalentDocument]), // ★ ここが重要
    StorageModule,
  ],
  controllers: [
    CompanyTalentController, // API: /companies/:companyId/talents/*
    GlobalTalentController,
    TalentShowController, // ← 追加
  ],
  providers: [
    CompanyTalentService,
    GlobalTalentService
  ],
  exports: [
    // Settings 側（SSR）で Service を使えるように export
    CompanyTalentService,
    GlobalTalentService
  ],
})
export class TalentsModule {}