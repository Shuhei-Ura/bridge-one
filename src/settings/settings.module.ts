import { Module } from '@nestjs/common';
import { SettingsController } from './settings.controller'; // 会社情報の方を入れてるなら
import { SettingsUsersController } from './settings-users.controller';
import { CompaniesModule } from '../admin/companies/companies.module';
import { UsersModule } from '../admin/users/users.module';

import { SettingsTalentsController } from './settings-talents.controller';
import { TalentsModule } from '../talents/talents.module';

@Module({
  imports: [
    CompaniesModule, 
    UsersModule,
    TalentsModule
  ],
  controllers: [
    SettingsController, 
    SettingsUsersController,
    SettingsTalentsController
  ],
})
export class SettingsModule {}
