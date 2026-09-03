import fs from 'fs';
import path from 'path';
import os from 'os';
import { env } from '../config/env.js';

export function getUploadDirectory(): string {
  // In serverless environments (Vercel / AWS Lambda), the only writable directory is os.tmpdir() (/tmp)
  const isServerless = !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME;
  
  const uploadDir = isServerless 
    ? path.join(os.tmpdir(), 'speedscale_uploads') 
    : path.resolve(env.UPLOAD_DIR || './uploads');

  try {
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
  } catch (e) {
    // Fail-safe: ignore mkdir errors in read-only filesystems
  }

  return uploadDir;
}
