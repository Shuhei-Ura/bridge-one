export type CompanyType = 'ses' | 'end' | null;
export type UserRole = 'admin' | 'manager' | 'member' | null;

type Ctx = { role: UserRole; company: CompanyType };

const anyone    = (_: Ctx) => true;
const isSes     = ({ company }: Ctx) => company === 'ses';
const isEnd     = ({ company }: Ctx) => company === 'end';
const isAdmin   = ({ role }: Ctx)    => role === 'admin';
const isManager = ({ role }: Ctx)    => role === 'manager';

export interface MenuItem {
  key: string;
  label: string;
  href: string; // :companyId を含む文字列
  visibleIf: (ctx: Ctx) => boolean;
}

export const ALL_MENU_ITEMS: MenuItem[] = [
  // 共通
  { key: 'search-t',  label: 'グローバル要員検索',         href: '/search/talents',       visibleIf: anyone },
  { key: 'req-in',    label: 'リクエスト受信箱',   href: '/companies/:companyId/requests/inbox',       visibleIf: anyone },
  { key: 'req-out',   label: '送信済みリクエスト', href: '/companies/:companyId/requests/sent',        visibleIf: anyone },

  // admin / manager 共通
  { key: 'org',       label: '会社情報の編集',     href: '/companies/:companyId/settings/company',     visibleIf: (c) => isAdmin(c) || isManager(c) },
  { key: 'accounts',  label: 'ユーザー管理',       href: '/companies/:companyId/settings/users',       visibleIf: (c) => isAdmin(c) || isManager(c) },

  // SES だけ
  { key: 'my-t',      label: '自社要員一覧',       href: '/companies/:companyId/settings/talents',              visibleIf: (c) => isSes(c) || isAdmin(c) },
  { key: 'new-t',     label: '自社要員登録',       href: '/companies/:companyId/settings/talents/new',          visibleIf: (c) => isSes(c) || isAdmin(c) },
  //{ key: 'search-o',  label: '案件を探す',         href: '/companies/:companyId/search/opportunities', visibleIf: (c) => isSes(c) || isAdmin(c) },

  // END だけ
  { key: 'new-o',     label: '自社案件登録',       href: '/companies/:companyId/opportunities/new',    visibleIf: (c) => isEnd(c) },
  { key: 'my-o',      label: '自社案件一覧',       href: '/companies/:companyId/opportunities',        visibleIf: (c) => isEnd(c) },

  // Admin（あなた専用画面は企業スコープ不要）
  { key: 'admin-companies', label: 'admin企業管理',     href: '/admin/companies',       visibleIf: isAdmin },
  { key: 'admin-audit',     label: 'admin監査ログ',     href: '/admin/audit',           visibleIf: isAdmin },
  { key: 'admin-settings',  label: 'adminシステム設定', href: '/admin/settings',        visibleIf: isAdmin },
];

export function buildMenu(ctx: Ctx, companyId: number | string): MenuItem[] {
  const order: string[] =
    ctx.company === 'ses'
      ? ['search-t','search-o','req-in','req-out','new-t','my-t','org','accounts','admin-companies','admin-audit','admin-settings']
      : ['search-t',          'req-in','req-out','new-o','my-o','org','accounts','admin-companies','admin-audit','admin-settings'];

  const visible = ALL_MENU_ITEMS
    .filter(m => m.visibleIf(ctx))
    .map(m => ({
      ...m,
      href: m.href.replace(':companyId', String(companyId ?? '')),
    }));

  const score = new Map(order.map((k, i) => [k, i]));
  return visible.sort((a, b) => (score.get(a.key) ?? 999) - (score.get(b.key) ?? 999));
}

