import { randomUUID } from 'crypto';

export function requestContext(req: any, res: any, next: any) {
  const ctx = {
    requestId: randomUUID(),
    userId: req.user?.id || null,
    role: req.user?.role || null,
    ip: req.ip,
    ua: req.headers['user-agent'] || null,
  };
  (req as any).ctx = ctx;
  res.setHeader('X-Request-Id', ctx.requestId);
  next();
}