import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UsePipes,
} from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { CompanyTalentService } from '../services/company-talent.service';
import { CreateTalentDto } from '../dto/create-talent.dto';
import { UpdateTalentDto } from '../dto/update-talent.dto';
import { CompanySearchTalentDto } from '../dto/company-search-talent.dto';

// 例）必要なら認可を後で有効化
import { UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../auth/auth.guard';


@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
@Controller('companies/:companyId/talents')
@UseGuards(AuthGuard)
export class CompanyTalentController {
  constructor(private readonly service: CompanyTalentService) {}

  /**
   * 検索（自社）
   * GET /companies/:companyId/talents?role=&prefecture=&minAge=&maxAge=&maxDesiredRate=&minWorkStyleLevel=&maxStatusLevel=&keywords=&page=&pageSize=
   */
  @Get()
  async search(
    @Param('companyId') companyId: string,
    @Query() query: CompanySearchTalentDto,
  ) {
    return this.service.search(companyId, query);
  }

  /**
   * 1件取得（自社）
   * GET /companies/:companyId/talents/:id
   */
  @Get(':id')
  async findOne(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.service.findOne(companyId, id);
  }

  /**
   * 作成（自社）
   * POST /companies/:companyId/talents
   */
  @Post()
  async create(
    @Param('companyId') companyId: string,
    @Body() dto: CreateTalentDto,
  ) {
    return this.service.create(companyId, dto);
  }

  /**
   * 更新（自社）
   * PATCH /companies/:companyId/talents/:id
   */
  @Post(':id')
  async update(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateTalentDto,
  ) {
    return this.service.update(companyId, id, dto);
  }

  /**
   * 削除（自社）
   * DELETE /companies/:companyId/talents/:id
   */
  @Delete(':id')
  async remove(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    await this.service.remove(companyId, id);
    return { ok: true };
  }
}
