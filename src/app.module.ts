import { MiddlewareConsumer, Module } from '@nestjs/common';
import { ViewLocalsMiddleware } from './common/view-locals.middleware';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Company } from './companies/company.entity';
import { User } from './users/user.entity';
import { Talent } from './talents/talent.entity';
import { Opportunity } from './opportunities/opportunity.entity';
import { TalentRequest } from './requests/talent-request.entity';
import { OpportunityRequest } from './requests/opportunity-request.entity';

import { MenuController } from './menu/menu.controller';

// 必要であれば ConfigModule も
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { APP_GUARD } from '@nestjs/core';
import { AuthGuard } from './auth/auth.guard';
import { AdminModule } from './admin/admin.module';
import { SettingsModule } from './settings/settings.module';
import { TalentsModule } from './talents/talents.module';
import { TalentRequestsModule } from './requests/talent-requests.module';


@Module({
  imports: [
    AdminModule,
    ConfigModule.forRoot({
      isGlobal: true, // ← .env をどこでも使えるようにする
    }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        type: 'mysql',
        host: cfg.get('DB_HOST', '127.0.0.1'),
        port: cfg.get('DB_PORT', 3306),
        username: cfg.get('DB_USER', 'root'),
        password: cfg.get('DB_PASS', ''),
        database: cfg.get('DB_NAME', 'bridge_one'),
        entities: [
          Company,
          User,
          Talent,
          Opportunity,
          TalentRequest,
          OpportunityRequest,
        ],
        synchronize: false, // ← データ消える事故防止
      }),
    }),
    AuthModule,
    SettingsModule,
    TalentsModule,    // ← これを追加
    TalentRequestsModule,
    // ここに feature modules を later で追加していく:
    // CompaniesModule,
    // TalentsModule,
    // OpportunitiesModule,
    // RequestsModule,
  ],
  controllers: [MenuController],
  providers: [
    // これで全ルートに AuthGuard をデフォルト適用
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
})

export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(ViewLocalsMiddleware).forRoutes('*');
  }
}