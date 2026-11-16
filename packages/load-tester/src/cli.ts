import { LoadTestRunner } from './engine.js';
import type { LoadTestConfig, TrafficPattern } from '@micro/shared';

function parseArgs(): LoadTestConfig & { gatewayUrl: string } {
  const args = process.argv.slice(2);
  let rps = 50;
  let durationSeconds = 30;
  let concurrency = 5;
  let targetService: LoadTestConfig['targetService'] = 'all';
  let pattern: TrafficPattern = 'normal';
  let gatewayUrl = 'http://localhost:8080';

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--rps' && args[i + 1]) {
      rps = parseInt(args[++i], 10);
    } else if (arg === '--duration' && args[i + 1]) {
      durationSeconds = parseInt(args[++i], 10);
    } else if (arg === '--concurrency' && args[i + 1]) {
      concurrency = parseInt(args[++i], 10);
    } else if (arg === '--target' && args[i + 1]) {
      targetService = args[++i] as any;
    } else if (arg === '--pattern' && args[i + 1]) {
      pattern = args[++i] as TrafficPattern;
    } else if (arg === '--gateway' && args[i + 1]) {
      gatewayUrl = args[++i];
    }
  }

  return { rps, durationSeconds, concurrency, targetService, pattern, gatewayUrl };
}

const config = parseArgs();

console.clear();
console.log('====================================================');
console.log('   MICROSERVICES PLAYGROUND LOAD GENERATOR CLI      ');
console.log('====================================================');
console.log(` Target Gateway: ${config.gatewayUrl}`);
console.log(` Target Service: ${config.targetService}`);
console.log(` Target RPS:     ${config.rps}`);
console.log(` Duration:       ${config.durationSeconds}s`);
console.log(` Pattern:        ${config.pattern}`);
console.log('====================================================');
console.log(' Sending live HTTP traffic... Press Ctrl+C to stop.\n');

const runner = new LoadTestRunner(config, config.gatewayUrl, (progress) => {
  const errRate =
    progress.totalRequestsSent > 0
      ? ((progress.errorCount / progress.totalRequestsSent) * 100).toFixed(1)
      : '0.0';

  process.stdout.write(
    `\r [${progress.elapsedSeconds}/${progress.totalSeconds}s] ` +
    `RPS: ${progress.currentRps} | ` +
    `Total: ${progress.totalRequestsSent} | ` +
    `OK: ${progress.successCount} | ` +
    `Err: ${progress.errorCount} (${errRate}%) | ` +
    `Avg: ${progress.avgLatencyMs}ms | ` +
    `p95: ${progress.p95}ms | ` +
    `p99: ${progress.p99}ms `
  );
});

runner.start();

process.on('SIGINT', () => {
  console.log('\n\nGracefully stopping load test...');
  runner.stop();
  const summary = runner.getProgress();
  console.log('====================================================');
  console.log('                   TEST SUMMARY                     ');
  console.log('====================================================');
  console.log(` Total Requests: ${summary.totalRequestsSent}`);
  console.log(` Successful:     ${summary.successCount}`);
  console.log(` Failed:         ${summary.errorCount}`);
  console.log(` Avg Latency:    ${summary.avgLatencyMs}ms`);
  console.log(` p50: ${summary.p50}ms | p90: ${summary.p90}ms | p95: ${summary.p95}ms | p99: ${summary.p99}ms`);
  console.log('====================================================');
  process.exit(0);
});
