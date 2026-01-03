import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Talent } from '../talent.entity';
import { GlobalSearchTalentDto } from '../dto/global-search-talent.dto';

@Injectable()
export class GlobalTalentService {
  constructor(
    @InjectRepository(Talent)
    private readonly repo: Repository<Talent>,
  ) {}

  // ========== グローバル検索 ========== 
  async search(q: GlobalSearchTalentDto) {
    const page = q.page ?? 0;
    const pageSize = q.pageSize ?? 50;

    const qb = this.repo
      .createQueryBuilder('t')
      // 離脱者は除外（必要な仕様）
      .where('t.status_level <= 2');

    this.applyGlobalFilters(qb, q);

    qb.orderBy('t.available_from', 'ASC')
      .addOrderBy('t.desired_rate', 'ASC')
      .addOrderBy('t.id', 'ASC');

    qb.take(pageSize).skip(page * pageSize);

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, pageSize };
  }

  // ----- フィルタ適用 -----
  private applyGlobalFilters(qb: SelectQueryBuilder<Talent>, q: GlobalSearchTalentDto) {

    // ← ここを追加：自社の要員を除外
    if (q.excludeCompanyId) {
      qb.andWhere('t.company_id <> :exCid', { exCid: q.excludeCompanyId });
    }
    
    // 都道府県
    if (q.prefecture) {
      qb.andWhere('t.prefecture = :pref', { pref: q.prefecture });
    }

    // 単価（下限）
    if (q.priceMin != null) {
      qb.andWhere('t.desired_rate >= :minR', { minR: q.priceMin });
    }

    // 単価（上限）
    if (q.priceMax != null) {
      qb.andWhere('t.desired_rate <= :maxR', { maxR: q.priceMax });
    }

    // 年齢（以下）
    if (q.ageMax != null) {
      qb.andWhere('t.age <= :ageMax', { ageMax: q.ageMax });
    }

    // ✅ 稼働スタイル（今回の本題）
    // フルリ → 全員 (>=1)
    // ハイブリ → 2,3 (>=2)
    // 常駐 → 3のみ (>=3)
    if (q.workStyleMax != null) {
      qb.andWhere('t.work_style_level >= :lvl', { lvl: q.workStyleMax });
    }

    // サマリ（部分一致 / LIKE でOK）
    if (q.summaryQ) {
      qb.andWhere('t.summary_text LIKE :kw', { kw: `%${q.summaryQ}%` });
    }
  }
}
