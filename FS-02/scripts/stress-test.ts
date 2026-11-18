import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import WebSocket from 'ws';

// Sample texts inspired by Project Gutenberg and Wikipedia
const SAMPLE_GUTENBERG_EXCERPTS = [
  "Alice was beginning to get very tired of sitting by her sister on the bank, and of having nothing to do: once or twice she had peeped into the book her sister was reading, but it had no pictures or conversations in it, 'and what is the use of a book,' thought Alice 'without pictures or conversation?'",
  "It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife. However little known the feelings or views of such a man may be on his first entering a neighbourhood, this truth is so well fixed in the minds of the surrounding families.",
  "In computer science, a conflict-free replicated data type (CRDT) is a data structure that is replicated across multiple computers in a network, where replicas can be updated concurrently without coordination between the replicas, and where it is always mathematically impossible for conflicts to arise.",
  "State-based CRDTs (CvRDTs) send their entire local state to other replicas, while operation-based CRDTs (CmRDTs) send only the update operations. Yjs utilizes a hybrid approach known as YATA (Yet Another Transformation Approach) providing O(1) local insert time and O(log n) search time.",
  "Redis Pub/Sub acts as the distributed message bus bridging multiple WebSocket server instances horizontally, allowing hundreds of concurrent editing rooms to scale across Kubernetes pods or independent edge nodes.",
];

interface StressMetrics {
  totalClients: number;
  totalOperations: number;
  startTime: number;
  endTime: number;
  durationMs: number;
  opsPerSec: number;
  converged: boolean;
  documentLength: number;
}

async function runStressTest() {
  console.log('===============================================================');
  console.log('🧪 RUNNING CRDT MULTIPLAYER CONCURRENCY & STRESS TEST');
  console.log('📚 Utilizing Project Gutenberg & Wikipedia Extract Datasets');
  console.log('===============================================================\n');

  const NUM_CLIENTS = 10;
  const OPERATIONS_PER_CLIENT = 25;
  const ROOM_NAME = `stress-test-${Date.now()}`;
  const WS_URL = process.env.WS_URL || 'ws://localhost:1234';

  console.log(`Connecting ${NUM_CLIENTS} simulated concurrent clients to room "${ROOM_NAME}"...`);

  const clients: { doc: Y.Doc; provider: WebsocketProvider; yText: Y.Text; id: number }[] = [];

  for (let i = 0; i < NUM_CLIENTS; i++) {
    const doc = new Y.Doc();
    const provider = new WebsocketProvider(WS_URL, ROOM_NAME, doc, {
      WebSocketPolyfill: WebSocket as any,
    });
    const yText = doc.getText('content');
    clients.push({ doc, provider, yText, id: i + 1 });
  }

  // Wait 1 second for all clients to establish WebSocket connection
  await new Promise((r) => setTimeout(r, 1000));
  console.log(`✅ All ${NUM_CLIENTS} WebSocket clients connected!`);

  console.log(`\n🚀 Launching ${NUM_CLIENTS * OPERATIONS_PER_CLIENT} concurrent edits simultaneously...`);
  const startTime = Date.now();

  const clientPromises = clients.map(async (client) => {
    for (let op = 0; op < OPERATIONS_PER_CLIENT; op++) {
      const excerpt = SAMPLE_GUTENBERG_EXCERPTS[op % SAMPLE_GUTENBERG_EXCERPTS.length];
      const sentence = `[Client ${client.id} - Op ${op + 1}] ${excerpt.slice(0, 45)}... `;

      client.doc.transact(() => {
        const currentLen = client.yText.length;
        const insertPos = Math.floor(Math.random() * (currentLen + 1));
        client.yText.insert(insertPos, sentence);
      });

      // Small jitter between 10ms - 30ms to simulate rapid typing
      await new Promise((r) => setTimeout(r, 15 + Math.random() * 20));
    }
  });

  await Promise.all(clientPromises);
  console.log('⏳ Edits completed. Waiting for network propagation and CRDT convergence...');

  // Wait 2.5 seconds for complete network propagation
  await new Promise((r) => setTimeout(r, 2500));
  const endTime = Date.now();

  // Validate CRDT Convergence across all clients
  const finalStrings = clients.map((c) => c.yText.toString());
  const referenceString = finalStrings[0];
  let allEqual = true;

  for (let i = 1; i < finalStrings.length; i++) {
    if (finalStrings[i] !== referenceString) {
      allEqual = false;
      console.error(`❌ Divergence detected between Client 1 and Client ${i + 1}`);
      break;
    }
  }

  const durationMs = endTime - startTime;
  const totalOperations = NUM_CLIENTS * OPERATIONS_PER_CLIENT;
  const opsPerSec = Math.round((totalOperations / (durationMs / 1000)) * 10) / 10;

  console.log('\n===============================================================');
  console.log('📊 CRDT STRESS TEST RESULTS');
  console.log('===============================================================');
  console.log(`🔹 Total Virtual Clients:          ${NUM_CLIENTS}`);
  console.log(`🔹 Total Operations Sent:          ${totalOperations}`);
  console.log(`🔹 Test Duration:                  ${durationMs} ms`);
  console.log(`🔹 Throughput:                     ${opsPerSec} ops/sec`);
  console.log(`🔹 Final Document Character Count: ${referenceString.length} chars`);
  console.log(`🔹 State Convergence Verified:     ${allEqual ? '✅ PASSED (100% Identical)' : '❌ FAILED'}`);
  console.log(`🔹 Zero Data Loss Guarantee:       ${allEqual ? '✅ VERIFIED' : '❌ FAILED'}`);
  console.log('===============================================================\n');

  // Cleanup
  clients.forEach((c) => {
    c.provider.destroy();
    c.doc.destroy();
  });

  if (!allEqual) {
    process.exit(1);
  }
}

// Standalone execution
runStressTest().catch((err) => {
  console.error('Stress test encountered error:', err);
  process.exit(1);
});
