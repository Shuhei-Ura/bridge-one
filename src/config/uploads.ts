// src/config/uploads.ts
import * as fs from 'fs';
import * as path from 'path';

// 物理のルートを public/uploads に固定
const root = path.join(process.cwd(), 'public', 'uploads');

export function getUploadsRoot(): string {
  if (!fs.existsSync(root)) fs.mkdirSync(root, { recursive: true });
  return root;
}

/** /public/uploads/<subdir> を作って絶対パスを返す */
export function ensureSubdir(subdir: string): string {
  const abs = path.join(getUploadsRoot(), subdir);
  if (!fs.existsSync(abs)) fs.mkdirSync(abs, { recursive: true });
  return abs;
}

/** talents ファイル専用の絶対パス (/public/uploads/talents) を返す */
export function getTalentsRoot(): string {
  return ensureSubdir('talents');
}

/** 公開URLのベースは /uploads */
export function uploadsPublicBase(): string {
  return '/uploads';
}

/** 公開URL: /uploads/talents/<filename> を返す（filenameは必ずbasename化） */
export function talentsPublicUrl(filename: string): string {
  const safe = path.basename(filename);
  return path.posix.join(uploadsPublicBase(), 'talents', safe);
}

/** 物理保存先: /public/uploads/talents/<filename> を返す（filenameは必ずbasename化） */
export function talentsAbsPath(filename: string): string {
  const safe = path.basename(filename);
  return path.join(getTalentsRoot(), safe);
}
