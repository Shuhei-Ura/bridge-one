import { SelectQueryBuilder } from 'typeorm';
import { Talent } from '../talent.entity';

export type Page = { page?: number; pageSize?: number };

export function applyCoreFilters(
  qb: SelectQueryBuilder<Talent>,
  opts: {
    role?: string;
    prefecture?: string;
    minWorkStyleLevel?: number;
    maxDesiredRate?: number;
    minAge?: number;
    maxAge?: number;
    keywords?: string;
  }
) {
  if (opts.role) qb.andWhere('t.role = :role', { role: opts.role });
  if (opts.prefecture) qb.andWhere('t.prefecture = :pref', { pref: opts.prefecture });
  if (opts.minWorkStyleLevel) qb.andWhere('t.work_style_level >= :lvl', { lvl: opts.minWorkStyleLevel });
  if (opts.maxDesiredRate) qb.andWhere('t.desired_rate <= :dr', { dr: opts.maxDesiredRate });
  if (opts.minAge && opts.maxAge) qb.andWhere('t.age BETWEEN :minA AND :maxA', { minA: opts.minAge, maxA: opts.maxAge });
  else if (opts.minAge) qb.andWhere('t.age >= :minA', { minA: opts.minAge });
  else if (opts.maxAge) qb.andWhere('t.age <= :maxA', { maxA: opts.maxAge });

  if (opts.keywords) {
    qb.andWhere(`MATCH(t.summary_text) AGAINST (:kw IN BOOLEAN MODE)`, { kw: opts.keywords });
  }
  return qb;
}

export function applyPaging(qb: SelectQueryBuilder<Talent>, { page = 0, pageSize = 50 }: Page) {
  return qb.take(pageSize).skip(page * pageSize);
}
