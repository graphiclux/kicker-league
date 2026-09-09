import 'reflect-metadata';
import { Module, Catch, ExceptionFilter, ArgumentsHost, HttpException } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import express from 'express';
import Redis from 'ioredis';
import { AuthController } from './auth.controller';
import { LeaguesController } from './leagues.controller';
import { AdminController } from './admin.controller';
import { AppController } from './app.controller';
import { AuthGuard, AdminGuard } from './auth';
import { Realtime } from './realtime';
@Catch()
class Errors implements ExceptionFilter {
  catch(e: any, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse();
    if (e instanceof ZodError)
      return res
        .status(400)
        .json({ message: e.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ') });
    if (e instanceof HttpException) return res.status(e.getStatus()).json(e.getResponse());
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      const status = e.code === 'P2025' ? 404 : e.code === 'P2002' ? 409 : 400;
      return res
        .status(status)
        .json({
          message:
            e.code === 'P2002'
              ? 'This record already exists or the position has already been picked'
              : e.code === 'P2025'
                ? 'Record not found'
                : 'Database constraint prevented this action',
        });
    }
    if (e.constructor === Error) return res.status(400).json({ message: e.message });
    console.error(e);
    res.status(500).json({ message: 'An unexpected error occurred' });
  }
}
@Module({
  controllers: [AuthController, LeaguesController, AdminController, AppController],
  providers: [AuthGuard, AdminGuard, Realtime],
})
export class AppModule {}
async function main() {
  if (!process.env.JWT_ACCESS_SECRET || process.env.JWT_ACCESS_SECRET.length < 32)
    throw new Error('JWT_ACCESS_SECRET must contain at least 32 characters');
  if (
    process.env.NODE_ENV === 'production' &&
    (process.env.JWT_ACCESS_SECRET.includes('local-only') || process.env.COOKIE_SECURE !== 'true')
  )
    throw new Error('Production requires secure cookies and a unique JWT secret');
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  app.setGlobalPrefix('api');
  app.useGlobalFilters(new Errors());
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(express.json({ limit: '2mb' }));
  app.use(cookieParser());
  const origins = (process.env.CORS_ORIGINS || process.env.WEB_URL || '').split(',');
  app.enableCors({ origin: origins, credentials: true });
  const redis = new Redis(process.env.REDIS_URL!);
  app.use(async (req: any, res: any, next: any) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      const origin = req.headers.origin;
      if (origin && !origins.includes(origin))
        return res.status(403).json({ message: 'Origin not allowed' });
      if (req.headers['sec-fetch-site'] === 'cross-site')
        return res.status(403).json({ message: 'Cross-site request rejected' });
      if (req.cookies?.aing_access && !req.headers.authorization && !origin)
        return res
          .status(403)
          .json({ message: 'Origin required for cookie-authenticated requests' });
    }
    if (req.path.startsWith('/api/auth/') && req.method === 'POST') {
      try {
        const ip = req.socket.remoteAddress;
        const bucket = Math.floor(Date.now() / 60000);
        const key = `auth-rate:${ip}:${bucket}`;
        const n = await redis.incr(key);
        if (n === 1) await redis.expire(key, 65);
        if (n > 100)
          return res
            .status(429)
            .json({ message: 'Too many authentication attempts. Try again shortly.' });
      } catch {
        return res.status(503).json({ message: 'Authentication temporarily unavailable' });
      }
    }
    next();
  });
  SwaggerModule.setup(
    'api/docs',
    app,
    SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle("And It's No Good API")
        .setDescription(
          'First-party fantasy kicking API. Auth uses short-lived bearer tokens or HttpOnly cookies.',
        )
        .setVersion('1.0.0')
        .addBearerAuth()
        .build(),
    ),
  );
  app.enableShutdownHooks();
  await app.listen(3001, '0.0.0.0');
}
if (require.main === module)
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
