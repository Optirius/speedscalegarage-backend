import { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middlewares/auth.middleware.js';

export async function authRoutes(app: FastifyInstance) {
  // 1. Customer Registration
  app.post('/register', async (request, reply) => {
    const schema = z.object({
      email: z.string().email(),
      password: z.string().min(6),
      name: z.string().min(2),
      phone: z.string().optional()
    });

    const body = schema.parse(request.body);

    const existing = await prisma.user.findUnique({ where: { email: body.email } });
    if (existing) {
      return reply.status(400).send({ error: 'An account with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(body.password, 10);
    const user = await prisma.user.create({
      data: {
        email: body.email,
        passwordHash,
        name: body.name,
        phone: body.phone,
        role: 'CUSTOMER',
        authProvider: 'LOCAL'
      }
    });

    const token = app.jwt.sign({ userId: user.id, email: user.email, role: user.role }, { expiresIn: '7d' });

    return reply.status(201).send({
      user: { id: user.id, email: user.email, name: user.name, role: user.role, phone: user.phone },
      token
    });
  });

  // 2. Customer Login
  app.post('/login', async (request, reply) => {
    const schema = z.object({
      email: z.string().email(),
      password: z.string()
    });

    const body = schema.parse(request.body);

    const user = await prisma.user.findUnique({
      where: { email: body.email },
      include: { addresses: true }
    });

    if (!user || !user.passwordHash) {
      return reply.status(401).send({ error: 'Invalid email or password.' });
    }

    const validPassword = await bcrypt.compare(body.password, user.passwordHash);
    if (!validPassword) {
      return reply.status(401).send({ error: 'Invalid email or password.' });
    }

    const token = app.jwt.sign({ userId: user.id, email: user.email, role: user.role }, { expiresIn: '7d' });

    return reply.send({
      user: { id: user.id, email: user.email, name: user.name, role: user.role, phone: user.phone, addresses: user.addresses },
      token
    });
  });

  // 3. Admin Login
  app.post('/admin/login', async (request, reply) => {
    const schema = z.object({
      email: z.string().email(),
      password: z.string()
    });

    const body = schema.parse(request.body);

    const admin = await prisma.user.findUnique({
      where: { email: body.email }
    });

    if (!admin || admin.role !== 'ADMIN' || !admin.passwordHash) {
      return reply.status(401).send({ error: 'Invalid admin credentials or insufficient privileges.' });
    }

    const valid = await bcrypt.compare(body.password, admin.passwordHash);
    if (!valid) {
      return reply.status(401).send({ error: 'Invalid admin credentials.' });
    }

    const token = app.jwt.sign({ userId: admin.id, email: admin.email, role: 'ADMIN' }, { expiresIn: '24h' });

    return reply.send({
      user: { id: admin.id, email: admin.email, name: admin.name, role: 'ADMIN' },
      token
    });
  });

  // 4. Facebook OAuth Verification Hook
  app.post('/facebook', async (request, reply) => {
    const schema = z.object({
      fbUserId: z.string(),
      email: z.string().email().optional(),
      name: z.string()
    });

    const body = schema.parse(request.body);
    const email = body.email || `fb_${body.fbUserId}@speedscalegarage.com`;

    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name: body.name,
          role: 'CUSTOMER',
          authProvider: 'FACEBOOK'
        }
      });
    }

    const token = app.jwt.sign({ userId: user.id, email: user.email, role: user.role }, { expiresIn: '7d' });

    return reply.send({
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      token
    });
  });

  // 5. Get Current User Profile
  app.get('/me', { preHandler: [authenticate] }, async (request, reply) => {
    const user = await prisma.user.findUnique({
      where: { id: request.user!.userId },
      include: { addresses: true }
    });

    if (!user) return reply.status(404).send({ error: 'User not found.' });

    return reply.send({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role,
        addresses: user.addresses
      }
    });
  });
}
