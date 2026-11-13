import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import * as Y from 'yjs';
import * as syncProtocol from 'y-protocols/sync';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';
import Redis from 'ioredis';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PORT = parseInt(process.env.WS_PORT || '1234', 10);
const NODE_ID = process.env.NODE_ID || `node-${Math.random().toString(36).substring(2, 7)}`;
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const messageSync = 0;
const messageAwareness = 1;

interface ClientConnection {
  ws: WebSocket;
  subscribedDocs: Set<string>;
}

class WSSharedDoc extends Y.Doc {
  name: string;
  conns: Map<WebSocket, Set<number>>;
  awareness: awarenessProtocol.Awareness;
  saveTimeout: NodeJS.Timeout | null = null;

  constructor(name: string) {
    super({ gc: true });
    this.name = name;
    this.conns = new Map();
    this.awareness = new awarenessProtocol.Awareness(this);
    this.awareness.setLocalState(null);

    const awarenessChangeHandler = (
      { added, updated, removed }: { added: number[]; updated: number[]; removed: number[] },
      origin: any
    ) => {
      const changedClients = added.concat(updated, removed);
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, messageAwareness);
      encoding.writeVarUint8Array(
        encoder,
        awarenessProtocol.encodeAwarenessUpdate(this.awareness, changedClients)
      );
      const buff = encoding.toUint8Array(encoder);

      // Broadcast to local clients
      this.conns.forEach((_, conn) => {
        send(this, conn, buff);
      });

      // Broadcast awareness across Redis if not originated from Redis
      if (origin !== 'redis' && redisPublisher) {
        try {
          redisPublisher.publish(
            `crdt:awareness:${this.name}`,
            Buffer.from(buff).toString('base64')
          ).catch(() => {});
        } catch (_) {}
      }
    };

    this.awareness.on('update', awarenessChangeHandler);

    this.on('update', (update: Uint8Array, origin: any) => {
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, messageSync);
      syncProtocol.writeUpdate(encoder, update);
      const buff = encoding.toUint8Array(encoder);

      // Broadcast to local clients connected to this document
      this.conns.forEach((_, conn) => {
        send(this, conn, buff);
      });

      // Broadcast update across Redis cluster to other WebSocket server instances
      if (origin !== 'redis' && redisPublisher) {
        try {
          redisPublisher.publish(
            `crdt:doc:${this.name}`,
            Buffer.from(update).toString('base64')
          ).catch(() => {});
        } catch (_) {}
      }

      // Debounce persistence to database
      this.scheduleSave();
    });
  }

  scheduleSave() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveTimeout = setTimeout(async () => {
      await this.persistToDatabase();
    }, 2000);
  }

  async persistToDatabase() {
    try {
      const state = Y.encodeStateAsUpdate(this);
      const base64State = Buffer.from(state).toString('base64');

      // Check if document exists before persisting
      const doc = await prisma.document.findUnique({
        where: { id: this.name },
      });

      if (doc) {
        await prisma.document.update({
          where: { id: this.name },
          data: {
            yjsState: base64State,
            updatedAt: new Date(),
          },
        });
        console.log(`[${NODE_ID}] Persisted document "${this.name}" to database (${state.byteLength} bytes)`);
      }
    } catch (err) {
      console.error(`[${NODE_ID}] Error persisting document "${this.name}":`, err);
    }
  }

  async loadFromDatabase() {
    try {
      const doc = await prisma.document.findUnique({
        where: { id: this.name },
      });

      if (doc && doc.yjsState) {
        const update = Buffer.from(doc.yjsState, 'base64');
        Y.applyUpdate(this, update, 'persistence');
        console.log(`[${NODE_ID}] Restored document "${this.name}" from database (${update.byteLength} bytes)`);
      }
    } catch (err) {
      console.error(`[${NODE_ID}] Error loading document "${this.name}" from database:`, err);
    }
  }
}

const docs = new Map<string, WSSharedDoc>();

const getYDoc = async (docName: string): Promise<WSSharedDoc> => {
  let doc = docs.get(docName);
  if (!doc) {
    doc = new WSSharedDoc(docName);
    docs.set(docName, doc);
    await doc.loadFromDatabase();

    // Subscribe to Redis updates for this document if Redis subscriber is active
    if (redisSubscriber) {
      try {
        await redisSubscriber.subscribe(`crdt:doc:${docName}`, `crdt:awareness:${docName}`);
      } catch (_) {}
    }
  }
  return doc;
};

// Setup Redis Pub/Sub for horizontal scaling across multiple server instances
let redisPublisher: Redis | null = null;
let redisSubscriber: Redis | null = null;

try {
  redisPublisher = new Redis(REDIS_URL, {
    maxRetriesPerRequest: 1,
    retryStrategy: () => null, // Don't crash if Redis is unavailable
  });

  redisSubscriber = new Redis(REDIS_URL, {
    maxRetriesPerRequest: 1,
    retryStrategy: () => null,
  });

  redisPublisher.on('connect', () => {
    console.log(`[${NODE_ID}] Redis Publisher connected successfully!`);
  });

  redisSubscriber.on('connect', () => {
    console.log(`[${NODE_ID}] Redis Subscriber connected successfully!`);
  });

  redisPublisher.on('error', (err) => {
    console.warn(`[${NODE_ID}] Redis Publisher warning (running single-node fallback):`, err.message);
  });

  redisSubscriber.on('error', (err) => {
    console.warn(`[${NODE_ID}] Redis Subscriber warning (running single-node fallback):`, err.message);
  });

  redisSubscriber.on('message', (channel: string, message: string) => {
    if (channel.startsWith('crdt:doc:')) {
      const docName = channel.replace('crdt:doc:', '');
      const doc = docs.get(docName);
      if (doc) {
        const update = Buffer.from(message, 'base64');
        Y.applyUpdate(doc, update, 'redis');
      }
    } else if (channel.startsWith('crdt:awareness:')) {
      const docName = channel.replace('crdt:awareness:', '');
      const doc = docs.get(docName);
      if (doc) {
        const updateBuff = Buffer.from(message, 'base64');
        const decoder = decoding.createDecoder(updateBuff);
        const msgType = decoding.readVarUint(decoder);
        if (msgType === messageAwareness) {
          awarenessProtocol.applyAwarenessUpdate(
            doc.awareness,
            decoding.readVarUint8Array(decoder),
            'redis'
          );
        }
      }
    }
  });
} catch (e) {
  console.warn(`[${NODE_ID}] Redis initialization failed, proceeding with in-memory single-node mode`);
}

const send = (doc: WSSharedDoc, conn: WebSocket, m: Uint8Array) => {
  if (conn.readyState !== WebSocket.OPEN) {
    closeConn(doc, conn);
    return;
  }
  try {
    conn.send(m, (err) => {
      if (err) closeConn(doc, conn);
    });
  } catch (e) {
    closeConn(doc, conn);
  }
};

const closeConn = (doc: WSSharedDoc, conn: WebSocket) => {
  if (doc.conns.has(conn)) {
    const controlledIds = doc.conns.get(conn);
    doc.conns.delete(conn);
    if (controlledIds) {
      awarenessProtocol.removeAwarenessStates(doc.awareness, Array.from(controlledIds), null);
    }
    if (doc.conns.size === 0) {
      // Document has no local connections; persist state
      doc.persistToDatabase();
    }
  }
  try {
    conn.close();
  } catch (e) {}
};

// Create HTTP Server & WebSocket Server
const server = http.createServer((req, res) => {
  if (req.url === '/health' || req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        status: 'ok',
        nodeId: NODE_ID,
        docsCount: docs.size,
        uptime: process.uptime(),
        redisConnected: redisPublisher?.status === 'ready',
      })
    );
    return;
  }
  res.writeHead(404);
  res.end('Not found');
});

const wss = new WebSocketServer({ server });

wss.on('connection', async (conn: WebSocket, req: http.IncomingMessage) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const docName = url.pathname.slice(1) || url.searchParams.get('room') || 'default-room';

  conn.binaryType = 'arraybuffer';
  const doc = await getYDoc(docName);
  doc.conns.set(conn, new Set());

  // Listen for client messages
  conn.on('message', (message: ArrayBuffer) => {
    try {
      const buffer = new Uint8Array(message);
      const encoder = encoding.createEncoder();
      const decoder = decoding.createDecoder(buffer);
      const messageType = decoding.readVarUint(decoder);

      switch (messageType) {
        case messageSync:
          encoding.writeVarUint(encoder, messageSync);
          syncProtocol.readSyncMessage(decoder, encoder, doc, conn);
          if (encoding.length(encoder) > 1) {
            send(doc, conn, encoding.toUint8Array(encoder));
          }
          break;
        case messageAwareness:
          awarenessProtocol.applyAwarenessUpdate(
            doc.awareness,
            decoding.readVarUint8Array(decoder),
            conn
          );
          break;
      }
    } catch (err) {
      console.error(`[${NODE_ID}] Error processing WebSocket message:`, err);
    }
  });

  conn.on('close', () => {
    closeConn(doc, conn);
  });

  conn.on('error', () => {
    closeConn(doc, conn);
  });

  // Step 1: Send Sync Step 1 to new client
  {
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, messageSync);
    syncProtocol.writeSyncStep1(encoder, doc);
    send(doc, conn, encoding.toUint8Array(encoder));
  }

  // Step 2: Send Awareness states to new client
  const awarenessStates = doc.awareness.getStates();
  if (awarenessStates.size > 0) {
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, messageAwareness);
    encoding.writeVarUint8Array(
      encoder,
      awarenessProtocol.encodeAwarenessUpdate(doc.awareness, Array.from(awarenessStates.keys()))
    );
    send(doc, conn, encoding.toUint8Array(encoder));
  }
});

server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 [${NODE_ID}] Yjs WebSocket Server running on port ${PORT}`);
  console.log(`📡 WebSocket endpoint: ws://localhost:${PORT}/<documentId>`);
  console.log(`🌐 Health check: http://localhost:${PORT}/health`);
  console.log(`🗄️ Redis Scalability Pub/Sub: ${REDIS_URL}`);
  console.log(`=======================================================`);
});
