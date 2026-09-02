import { FastifyInstance } from 'fastify';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { requireAdmin } from '../middlewares/auth.middleware.js';
import { env } from '../config/env.js';

export async function uploadRoutes(app: FastifyInstance) {
  // Ensure upload directory exists
  const uploadDir = path.resolve(env.UPLOAD_DIR);
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  // Admin: Upload and optimize product images
  app.post('/', { preHandler: [requireAdmin] }, async (request, reply) => {
    const data = await request.file();
    if (!data) {
      return reply.status(400).send({ error: 'No file uploaded.' });
    }

    const filename = `diecast_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.webp`;
    const outputPath = path.join(uploadDir, filename);

    const buffer = await data.toBuffer();

    // Sharp optimization pipeline (Convert to WebP with 85% quality and max width 1200px)
    await sharp(buffer)
      .resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 85 })
      .toFile(outputPath);

    const fileUrl = `${env.BASE_URL}/uploads/${filename}`;

    return reply.status(201).send({
      success: true,
      url: fileUrl,
      filename
    });
  });
}
