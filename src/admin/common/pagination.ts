export const toInt = (v: any, d = 1) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : d;
};

export function paginate<T>(items: T[], total: number, page: number, perPage: number) {
  const pages = Math.max(1, Math.ceil(total / perPage));
  return {
    items,
    page,
    perPage,
    total,
    pages,
    hasPrev: page > 1,
    hasNext: page < pages,
  };
}