import { FastifyInstance } from 'fastify';
import path from 'path';
import sharp from 'sharp';
import { put } from '@vercel/blob';
import { requireAdmin } from '../middlewares/auth.middleware.js';
import { env } from '../config/env.js';
import { getUploadDirectory } from '../lib/storage.js';

export async function uploadRoutes(app: FastifyInstance) {
  const uploadDir = getUploadDirectory();

  // Admin: Upload and optimize product images
  app.post('/', { preHandler: [requireAdmin] }, async (request, reply) => {
    const data = await request.file();
    if (!data) {
      return reply.status(400).send({ error: 'No file uploaded.' });
    }

    const filename = `diecast_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.webp`;
    const buffer = await data.toBuffer();

    // Sharp optimization pipeline (Convert to WebP with 85% quality and max width 1200px)
    const optimizedBuffer = await sharp(buffer)
      .resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer();

    // 1. If Vercel Blob token is configured, upload directly to permanent Global Edge CDN
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      try {
        const blob = await put(`products/${filename}`, optimizedBuffer, {
          access: 'public',
          contentType: 'image/webp'
        });

        return reply.status(201).send({
          success: true,
          url: blob.url,
          filename
        });
      } catch (blobErr) {
        app.log.error(blobErr, 'Vercel Blob upload error, falling back to local file storage');
      }
    }

    // 2. Local / Serverless filesystem fallback
    const outputPath = path.join(uploadDir, filename);
    await sharp(optimizedBuffer).toFile(outputPath);

    const fileUrl = `${env.BASE_URL}/uploads/${filename}`;

    return reply.status(201).send({
      success: true,
      url: fileUrl,
      filename
    });
  });
}
