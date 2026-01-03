import { SetMetadata } from '@nestjs/common';
import type { AppRole } from './roles.guard';

export const ROLES_KEY = 'app:roles';
export const Roles = (...roles: AppRole[]) => SetMetadata(ROLES_KEY, roles);