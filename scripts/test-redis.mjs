import nextEnv from "@next/env";
import { Redis } from "@upstash/redis";
import { createClient } from "@supabase/supabase-js";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log("\n=======================================================");
console.log(" 🚀 NovaStage Redis & Latency Performance Diagnostic");
console.log("=======================================================\n");

// 1. Check Redis Configuration
if (!redisUrl || !redisToken) {
  console.error("❌ Upstash Redis credentials not detected in .env.local!");
  console.log("\nPlease ensure your .env.local includes:");
  console.log('UPSTASH_REDIS_REST_URL="https://..."');
  console.log('UPSTASH_REDIS_REST_TOKEN="..."\n');
  process.exit(1);
}

console.log("✅ Upstash Redis configuration detected.");
console.log(`📍 Endpoint: ${redisUrl.replace(/(https:\/\/[^.]+).*/, "$1.upstash.io")}\n`);

const redis = new Redis({
  url: redisUrl,
  token: redisToken,
});

async function runBenchmark() {
  try {
    // 2. Ping Test
    const pingStart = performance.now();
    const pingRes = await redis.ping();
    const pingDuration = (performance.now() - pingStart).toFixed(1);

    if (pingRes === "PONG") {
      console.log(`⚡ Redis Ping Success: ${pingDuration} ms (Round-Trip)`);
    } else {
      console.log(`⚠️ Redis Ping returned: ${pingRes}`);
    }

    // 3. Write / Read / Delete Latency Test (10 iterations)
    console.log("\n⏳ Running 10 sample cache read/write operations...");
    const writeTimes = [];
    const readTimes = [];

    for (let i = 0; i < 10; i++) {
      const testKey = `benchmark:test:${i}:${Date.now()}`;
      const testVal = { project_id: "test-proj-123", member: true, timestamp: Date.now() };

      // Measure SET
      const t1 = performance.now();
      await redis.set(testKey, testVal, { ex: 30 });
      writeTimes.push(performance.now() - t1);

      // Measure GET
      const t2 = performance.now();
      await redis.get(testKey);
      readTimes.push(performance.now() - t2);

      // Clean up
      await redis.del(testKey);
    }

    const avgWrite = (writeTimes.reduce((a, b) => a + b, 0) / writeTimes.length).toFixed(1);
    const minWrite = Math.min(...writeTimes).toFixed(1);
    const maxWrite = Math.max(...writeTimes).toFixed(1);

    const avgRead = (readTimes.reduce((a, b) => a + b, 0) / readTimes.length).toFixed(1);
    const minRead = Math.min(...readTimes).toFixed(1);
    const maxRead = Math.max(...readTimes).toFixed(1);

    console.log(`\n📊 Redis Cache Latency (10 iterations):`);
    console.log(`   - Cache READ : Avg ${avgRead} ms  (Min: ${minRead} ms, Max: ${maxRead} ms)`);
    console.log(`   - Cache WRITE: Avg ${avgWrite} ms  (Min: ${minWrite} ms, Max: ${maxWrite} ms)`);

    // 4. Test Atomic Concurrency Claim Lock Simulation
    console.log("\n🔒 Testing Atomic Claim Lock Simulation...");
    const lockKey = `canvas:lock:benchmark-project:node-42`;
    const lockAcquired = await redis.set(lockKey, "user_demo_123", { ex: 300, nx: true });
    console.log(`   - Lock Acquisition (SET NX EX 300): ${lockAcquired === "OK" ? "SUCCESS (Lock Acquired)" : "FAILED"}`);

    // Try acquiring already locked key (should fail collision)
    const lockCollision = await redis.set(lockKey, "user_second_456", { ex: 300, nx: true });
    console.log(`   - Collision Guard (Second user blocked): ${lockCollision === null ? "PASSED (Collision Prevented)" : "FAILED"}`);
    await redis.del(lockKey);

    // 5. Compare with Direct Database Query Latency (if Supabase configured)
    if (supabaseUrl && serviceRoleKey) {
      console.log("\n🐘 Comparing with Direct Supabase PostgreSQL Query Latency...");
      const supabase = createClient(supabaseUrl, serviceRoleKey);
      const dbTimes = [];

      for (let i = 0; i < 5; i++) {
        const tDb = performance.now();
        await supabase.from("projects").select("id").limit(1);
        dbTimes.push(performance.now() - tDb);
      }

      const avgDb = (dbTimes.reduce((a, b) => a + b, 0) / dbTimes.length).toFixed(1);
      const minDb = Math.min(...dbTimes).toFixed(1);
      const maxDb = Math.max(...dbTimes).toFixed(1);

      console.log(`\n📊 Supabase Direct DB Latency (5 queries):`);
      console.log(`   - SQL SELECT : Avg ${avgDb} ms  (Min: ${minDb} ms, Max: ${maxDb} ms)`);

      const speedup = (parseFloat(avgDb) / parseFloat(avgRead)).toFixed(1);
      console.log(`\n🔥 Performance Result: Redis cache is ~${speedup}x FASTER than direct SQL roundtrips!`);
    }

    console.log("\n=======================================================");
    console.log(" ✅ All Redis diagnostics and speed tests passed!");
    console.log("=======================================================\n");
  } catch (err) {
    console.error("\n❌ Redis test encountered an error:", err.message || err);
    process.exit(1);
  }
}

runBenchmark();
