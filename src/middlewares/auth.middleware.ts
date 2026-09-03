import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../lib/prisma.js';

export interface TokenPayload {
  userId: string;
  email: string;
  role: 'CUSTOMER' | 'ADMIN';
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: TokenPayload;
    user: TokenPayload;
  }
}

/**
 * Verifies JWT token and checks if user exists in database
 */
export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    const payload = await request.jwtVerify<TokenPayload>();
    
    // Database existence verification
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, role: true, isActive: true }
    });

    if (!user) {
      return reply.status(401).send({ error: 'Unauthorized. User account no longer exists.' });
    }

    if (user.isActive === false) {
      return reply.status(403).send({ error: 'Forbidden. Your account has been suspended or disabled.' });
    }

    request.user = {
      userId: user.id,
      email: user.email,
      role: user.role
    };
  } catch (err) {
    return reply.status(401).send({ error: 'Unauthorized. Invalid or expired token.' });
  }
}

/**
 * Verifies JWT token and guarantees active ADMIN role in the database
 */
export async function requireAdmin(request: FastifyRequest, reply: FastifyReply) {
  try {
    const payload = await request.jwtVerify<TokenPayload>();

    // Live database role verification prevents token forgery & revocation bypass
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, role: true, isActive: true }
    });

    if (!user || user.role !== 'ADMIN' || user.isActive === false) {
      return reply.status(403).send({ error: 'Forbidden. Active administrator privileges required.' });
    }

    request.user = {
      userId: user.id,
      email: user.email,
      role: 'ADMIN'
    };
  } catch (err) {
    return reply.status(401).send({ error: 'Unauthorized. Administrator authentication required.' });
  }
}

/**
 * Optionally extracts user payload if a valid token is provided
 */
export async function optionalAuth(request: FastifyRequest, _reply: FastifyReply) {
  try {
    const payload = await request.jwtVerify<TokenPayload>();
    request.user = payload;
  } catch (err) {
    // Optional auth - proceeds unauthenticated
  }
}
