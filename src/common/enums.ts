// talent_entity用
export const TALENT_STATUSES = ['marketing','interview','working','left'] as const;
export type TalentStatus = typeof TALENT_STATUSES[number];

export const WORK_STYLES = ['remote','hybrid','onsite'] as const; // 1=remote,2=hybrid,3=onsite
export type WorkStyle = typeof WORK_STYLES[number];

// talent_documents_entity用
export const TALENT_DOC_TYPES = ['skill_sheet','portfolio','cert'] as const;
export type TalentDocType = typeof TALENT_DOC_TYPES[number];

export const STORAGE_TYPES = ['url','upload','gdrive'] as const;
export type StorageType = typeof STORAGE_TYPES[number];

export const PREVIEW_TYPES = ['pdf','image','iframe','none'] as const;
export type PreviewType = typeof PREVIEW_TYPES[number];