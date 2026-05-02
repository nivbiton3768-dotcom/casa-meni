import { Global, Injectable, Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

/**
 * Real-time gateway. Each client joins a room keyed by their organizationId
 * after authenticating via JWT in the handshake (?token=...).
 *
 * Servers can call `RealtimeService.emitToOrg(orgId, event, payload)` to push
 * updates (notifications, maintenance progress, payments received, etc.)
 */
@Injectable()
export class RealtimeService {
  private readonly logger = new Logger(RealtimeService.name);
  private server?: Server;

  setServer(server: Server) {
    this.server = server;
  }

  emitToOrg(organizationId: string, event: string, payload: unknown) {
    if (!this.server) return;
    this.server.to(`org:${organizationId}`).emit(event, payload);
  }

  emitToUser(userId: string, event: string, payload: unknown) {
    if (!this.server) return;
    this.server.to(`user:${userId}`).emit(event, payload);
  }
}

@WebSocketGateway({
  cors: { origin: '*', credentials: true },
  path: '/socket.io',
})
@Injectable()
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(RealtimeGateway.name);

  constructor(
    private readonly realtime: RealtimeService,
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
  ) {}

  afterInit(server: Server) {
    this.realtime.setServer(server);
    this.logger.log('WebSocket gateway initialized');
  }

  handleConnection(client: Socket) {
    const token =
      (client.handshake.auth?.token as string | undefined) ??
      (client.handshake.query?.token as string | undefined);
    if (!token) {
      client.disconnect();
      return;
    }
    const secret = this.config.get<string>('JWT_SECRET');
    if (!secret) {
      client.disconnect();
      return;
    }
    try {
      const payload = this.jwt.verify(token, { secret }) as {
        sub: string;
        organizationId?: string;
      };
      if (payload.organizationId) {
        client.join(`org:${payload.organizationId}`);
      }
      client.join(`user:${payload.sub}`);
      this.logger.debug(`WS connected: user=${payload.sub} org=${payload.organizationId}`);
    } catch (err) {
      this.logger.warn(`WS auth failed: ${err instanceof Error ? err.message : err}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`WS disconnected: ${client.id}`);
  }
}

@Global()
@Module({
  imports: [JwtModule.register({})],
  providers: [RealtimeService, RealtimeGateway],
  exports: [RealtimeService],
})
export class RealtimeModule {}
