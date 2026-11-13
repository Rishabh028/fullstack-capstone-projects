import * as Y from 'yjs';

async function runBenchmark() {
  console.log('===============================================================');
  console.log('⚡ CRDT & PERFORMANCE BENCHMARK SUITE');
  console.log('===============================================================\n');

  // Benchmark 1: CRDT Local Insert & Delete Performance
  console.log('📈 [Test 1] Benchmark local insert & delete speeds (10,000 edits)...');
  const doc1 = new Y.Doc();
  const yText = doc1.getText('text');

  const t0 = performance.now();
  for (let i = 0; i < 10000; i++) {
    yText.insert(i, 'a');
  }
  const t1 = performance.now();
  const insertDuration = Math.round(t1 - t0);

  const t2 = performance.now();
  for (let i = 0; i < 2000; i++) {
    yText.delete(Math.floor(Math.random() * (yText.length - 1)), 1);
  }
  const t3 = performance.now();
  const deleteDuration = Math.round(t3 - t2);

  console.log(`   - 10,000 single-char inserts: ${insertDuration} ms (${Math.round(10000 / (insertDuration / 1000))} ops/sec)`);
  console.log(`   - 2,000 random deletes:       ${deleteDuration} ms (${Math.round(2000 / (deleteDuration / 1000))} ops/sec)`);

  // Benchmark 2: Binary Update Encoding & Decoding
  console.log('\n📦 [Test 2] Benchmark binary state compression & snapshot encoding...');
  const t4 = performance.now();
  const encodedState = Y.encodeStateAsUpdate(doc1);
  const t5 = performance.now();
  const encodeDuration = (t5 - t4).toFixed(2);

  console.log(`   - State size for 8,000 chars: ${encodedState.byteLength} bytes (~${(encodedState.byteLength / 1024).toFixed(1)} KB)`);
  console.log(`   - Encoding duration:          ${encodeDuration} ms`);

  // Benchmark 3: Snapshot Restoration into Fresh Doc
  console.log('\n🔄 [Test 3] Benchmark snapshot restore from binary buffer...');
  const doc2 = new Y.Doc();
  const t6 = performance.now();
  Y.applyUpdate(doc2, encodedState);
  const t7 = performance.now();
  const restoreDuration = (t7 - t6).toFixed(2);

  const stringsMatch = doc2.getText('text').toString() === yText.toString();
  console.log(`   - Restoration duration:       ${restoreDuration} ms`);
  console.log(`   - Data integrity verification: ${stringsMatch ? '✅ 100% Match' : '❌ Mismatch'}`);

  console.log('\n===============================================================');
  console.log('✅ BENCHMARKS COMPLETE');
  console.log('===============================================================\n');
}

runBenchmark();
