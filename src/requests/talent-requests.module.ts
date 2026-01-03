import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { TalentRequestsController } from './talent-requests.controller';
import { TalentRequestsInboxController } from './talent-requests-inbox.controller'; // ★追加
import { TalentRequestsService } from './talent-requests.service';

import { TalentRequest } from './talent-request.entity';
import { Talent } from '../talents/talent.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([TalentRequest, Talent]),
  ],
  controllers: [
    TalentRequestsController,
    TalentRequestsInboxController, // ★ここ追加！
  ],
  providers: [TalentRequestsService],
  exports: [TalentRequestsService], // 他から使う可能性があるならexport
})
export class TalentRequestsModule {}
