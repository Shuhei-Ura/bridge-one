import { Controller, Get, Render, Req } from '@nestjs/common';
import { buildMenu } from './menu.items';

@Controller()
export class MenuController {
  @Get('/menu')
  @Render('menu')
  menu(@Req() req: any) {
    const role    = (req.session?.user?.role ?? null) as 'admin'|'member'|null;
    const company = (req.res?.locals?.companyType ?? null) as 'ses'|'end'|null;

    const companyId = req.session?.user?.company_id;
    const items = buildMenu({ role, company }, companyId);
    return {
      title: 'メニュー',
      items,
      role,
      company,
      currentUser: req.session?.user ?? null,
      csrfToken: req.csrfToken?.(),
    };
  }
}
