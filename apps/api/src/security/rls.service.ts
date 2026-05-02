import {
  CallHandler,
  ExecutionContext,
  Global,
  Injectable,
  Logger,
  Module,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, from, of, switchMap } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Sets the Postgres `app.current_org` GUC for the duration of each request.
 *
 * This is opt-in — users only get coverage if the database has had the
 * RLS policies applied (see rls.sql). The interceptor is safe in non-RLS
 * environments because the SET fails silently for non-superuser roles only
 * if the GUC is not registered.
 *
 * For maximum effect this should be combined with a Prisma extension that
 * runs queries inside transactions. For now we issue an unscoped SET so
 * Postgres applies it to the connection-level session — fine for serverless
 * connection-per-request (Neon HTTP) but should be tightened later for
 * pgBouncer / pooled deployments.
 */
@Injectable()
export class RlsInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RlsInterceptor.name);
  private readonly enabled: boolean;

  constructor(private readonly prisma: PrismaService) {
    this.enabled = process.env.RLS_ENABLED === 'true';
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (!this.enabled) return next.handle();
    const req = context.switchToHttp().getRequest();
    const orgId = req?.user?.organizationId as string | undefined;
    if (!orgId) return next.handle();
    return from(
      this.prisma
        .$executeRawUnsafe(`SELECT set_config('app.current_org', $1, false)`, orgId)
        .catch((err) => {
          this.logger.warn(`RLS set_config failed: ${err.message}`);
          return 0;
        }),
    ).pipe(switchMap(() => next.handle()));
  }
}

@Global()
@Module({
  providers: [RlsInterceptor],
  exports: [RlsInterceptor],
})
export class SecurityModule {}
