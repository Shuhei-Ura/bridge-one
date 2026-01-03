import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../../users/user.entity';
import { Company } from '../../companies/company.entity';

const SALT_ROUNDS = 12;

type UserRole = 'admin' | 'manager' | 'member';

interface ListOpts {
  companyId?: number;       // ★任意: 指定時はその企業に限定、未指定で全社
  page?: number;
  perPage?: number;
  keyword?: string;
  role?: UserRole | 'all';
  is_active?: string | boolean | number | 'all';
}

interface CreateUserInput {
  company_id?: number;      // ★任意（未指定はエラーにする）
  name: string;
  email: string;
  role: UserRole;
  password: string;
  is_active?: string | boolean | number;
}

interface UpdateUserInput {
  company_id?: number;      // ★ここでは固定/移籍は扱わない（指定あっても無視/または別メソッド運用）
  name?: string;
  email?: string;
  role?: UserRole;
  password?: string;
  is_active?: string | boolean | number;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Company) private readonly companies: Repository<Company>,
  ) {}

  // ========== 一覧（companyId 指定時のみスコープ） ==========
  async list(opts: ListOpts) {
    const page = Number(opts.page ?? 1);
    const perPage = Number(opts.perPage ?? 20);

    const qb = this.users
      .createQueryBuilder('u')
      .leftJoinAndSelect('u.company', 'c')
      .orderBy('u.id', 'DESC');

    if (opts.companyId) {
      qb.where('c.id = :cid', { cid: Number(opts.companyId) });
    }

    if (opts.keyword) {
      qb.andWhere('(u.name LIKE :kw OR u.email LIKE :kw)', { kw: `%${opts.keyword}%` });
    }

    if (opts.role && opts.role !== 'all') {
      qb.andWhere('u.role = :role', { role: opts.role });
    }

    if (opts.is_active !== undefined && opts.is_active !== null && `${opts.is_active}` !== '' && opts.is_active !== 'all') {
      const ia =
        opts.is_active === true ||
        opts.is_active === '1' ||
        opts.is_active === 1 ||
        opts.is_active === 'on';
      qb.andWhere('u.is_active = :ia', { ia });
    }

    const total = await qb.getCount();
    const items = await qb.skip((page - 1) * perPage).take(perPage).getMany();
    return { items, total };
  }

  // ========== 企業セレクト用（有効企業のみ） ==========
  async companyOptionsActiveOnly() {
    return this.companies.find({
      where: { is_active: true as any },
      order: { name: 'ASC' as any },
    });
  }

  // ========== 作成（company_id 未指定ならエラー） ==========
  async create(input: CreateUserInput) {
    const companyId = Number(input.company_id);
    if (!companyId) throw new NotFoundException('company_id required');

    const company = await this.companies.findOne({ where: { id: companyId as any } });
    if (!company) throw new NotFoundException('company not found');

    const passwordHash = await bcrypt.hash(input.password.trim(), SALT_ROUNDS);
    const isActive =
      input.is_active == null
        ? true
        : input.is_active === true ||
          input.is_active === '1' ||
          input.is_active === 1 ||
          input.is_active === 'on';

    const user = this.users.create({
      name: input.name,
      email: input.email,
      role: input.role as any,
      is_active: isActive,
      passwordHash, // ← エンティティに合わせて
      company: { id: companyId } as any,
    });

    return this.users.save(user);
  }

  // ==============================
  // 1件取得：オーバーロード（互換）
  //   - findOne(userId)
  //   - findOne(companyId, userId)  … 企業スコープで厳格に
  // ==============================
  async findOne(userId: number): Promise<User>;
  async findOne(companyId: number, userId: number): Promise<User>;
  async findOne(a: number, b?: number): Promise<User> {
    if (typeof b === 'number') {
      // (companyId, userId)
      const companyId = a;
      const userId = b;
      const user = await this.users.findOne({
        where: { id: userId as any },
        relations: ['company'],
      });
      if (!user || Number((user.company as any)?.id ?? (user as any).company_id) !== Number(companyId)) {
        throw new NotFoundException('対象ユーザーが見つかりません');
      }
      return user;
    } else {
      // (userId) 旧呼び出し互換（admin画面等で全社から取得）
      const userId = a;
      const user = await this.users.findOne({
        where: { id: userId as any },
        relations: ['company'],
      });
      if (!user) throw new NotFoundException('対象ユーザーが見つかりません');
      return user;
    }
  }

  // ==============================
  // 更新：オーバーロード（互換）
  //   - update(userId, input)
  //   - update(companyId, userId, input) … スコープチェックあり
  // ==============================
  async update(userId: number, input: UpdateUserInput): Promise<User>;
  async update(companyId: number, userId: number, input: UpdateUserInput): Promise<User>;
  async update(a: number, b: any, c?: any): Promise<User> {
    let user: User;
    let input: UpdateUserInput;

    if (typeof c === 'undefined') {
      // (userId, input)
      const userId = a;
      input = b as UpdateUserInput;
      user = await this.findOne(userId); // 全社から
    } else {
      // (companyId, userId, input)
      const companyId = a;
      const userId = b as number;
      input = c as UpdateUserInput;
      user = await this.findOne(companyId, userId); // スコープチェック
    }

    if (typeof input.name === 'string') user.name = input.name;
    if (typeof input.email === 'string') user.email = input.email;
    if (typeof input.role === 'string') (user as any).role = input.role;

    if (input.is_active !== undefined && `${input.is_active}` !== '') {
      (user as any).is_active =
        input.is_active === true ||
        input.is_active === '1' ||
        input.is_active === 1 ||
        input.is_active === 'on';
    }

    if (input.password && input.password.trim()) {
      (user as any).passwordHash = await bcrypt.hash(input.password.trim(), SALT_ROUNDS);
      // (user as any).password = ...
    }

    return this.users.save(user);
  }

  // ==============================
  // 削除：オーバーロード（互換）
  //   - remove(userId)
  //   - remove(companyId, userId) … スコープチェックあり
  // ==============================
  async remove(userId: number): Promise<void>;
  async remove(companyId: number, userId: number): Promise<void>;
  async remove(a: number, b?: number): Promise<void> {
    if (typeof b === 'number') {
      // (companyId, userId) → 先に存在+スコープ確認
      await this.findOne(a, b);
      await this.users.delete({ id: b as any });
    } else {
      // (userId)
      await this.users.delete({ id: a as any });
    }
  }
}
