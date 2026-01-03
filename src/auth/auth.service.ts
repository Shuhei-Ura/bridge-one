import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/user.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
  ) {}

  async validateUser(email: string, plainPassword: string) {
    const normEmail = String(email ?? '').trim().toLowerCase();

    // ★ ここで passwordHash を「必要な時だけ」取得する
    const user = await this.usersRepo
      .createQueryBuilder('u')
      .leftJoinAndSelect('u.company', 'c')      // 会社情報もセッションで使うため
      .where('u.email = :email', { email: normEmail })
      .addSelect('u.passwordHash')              // ← select:false を上書きして取得
      .getOne();

    if (!user) throw new UnauthorizedException('メールアドレスが違います');

    const ok = await bcrypt.compare(plainPassword ?? '', user.passwordHash ?? '');
    if (!ok) throw new UnauthorizedException('パスワードが違います');

    // セッションに不要な情報は消して返す
    delete (user as any).passwordHash;
    return user;
  }
}