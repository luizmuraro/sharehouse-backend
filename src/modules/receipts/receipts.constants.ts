export const RECEIPT_MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
export const RECEIPT_MULTER_HARD_LIMIT_BYTES = 15 * 1024 * 1024;
export const RECEIPT_ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
] as const;
