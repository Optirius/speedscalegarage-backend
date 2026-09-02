import { FastifyRequest, FastifyReply } from 'fastify';

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

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    const payload = await request.jwtVerify<TokenPayload>();
    request.user = payload;
  } catch (err) {
    return reply.status(401).send({ error: 'Unauthorized. Invalid or expired token.' });
  }
}

export async function requireAdmin(request: FastifyRequest, reply: FastifyReply) {
  try {
    const payload = await request.jwtVerify<TokenPayload>();
    request.user = payload;
    if (payload.role !== 'ADMIN') {
      return reply.status(403).send({ error: 'Forbidden. Admin privileges required.' });
    }
  } catch (err) {
    return reply.status(401).send({ error: 'Unauthorized. Admin session required.' });
  }
}
