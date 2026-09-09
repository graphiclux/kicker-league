import {
  WebSocketGateway,
  OnGatewayConnection,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  WebSocketServer,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import { identify } from './auth';
import { member } from './leagues.controller';
@WebSocketGateway({
  cors: { origin: (process.env.CORS_ORIGINS || '').split(','), credentials: true },
  maxHttpBufferSize: 10000,
})
export class Realtime implements OnGatewayConnection, OnGatewayInit {
  @WebSocketServer() server!: Server;
  async afterInit(server: Server) {
    const pub = new Redis(process.env.REDIS_URL!);
    const sub = pub.duplicate();
    server.adapter(createAdapter(pub, sub));
    const events = pub.duplicate();
    await events.subscribe('aing:events');
    events.on('message', (_c, raw) => {
      const e = JSON.parse(raw);
      if (e.payload.leagueId) server.to(`league:${e.payload.leagueId}`).emit(e.topic, e.payload);
      else server.emit(e.topic, e.payload);
    });
  }
  async handleConnection(socket: Socket) {
    try {
      const u = await identify(socket.handshake.auth.token);
      socket.data.userId = u.id;
      socket.emit('ready');
    } catch {
      socket.disconnect(true);
    }
  }
  @SubscribeMessage('league.join') async join(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: any,
  ) {
    try {
      const u = await identify(socket.handshake.auth.token);
      await member(String(body.leagueId), u.id);
      for (const room of socket.rooms) if (room.startsWith('league:')) await socket.leave(room);
      await socket.join(`league:${body.leagueId}`);
      return { ok: true };
    } catch {
      return { ok: false };
    }
  }
}
