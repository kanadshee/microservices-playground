import express from 'express';
import cors from 'cors';
import {
  createServiceState,
  getServiceHealth,
  type WorkerJob,
} from '@micro/shared';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 4051;
const INSTANCE_ID = process.env.INSTANCE_ID || 'worker-service-1';

app.use(cors());
app.use(express.json());

const state = createServiceState('worker-service', INSTANCE_ID, PORT);
const jobQueue: WorkerJob[] = [];
let completedCount = 0;
let failedCount = 0;

// Worker background loop processing queue
setInterval(async () => {
  const pending = jobQueue.find((j) => j.status === 'queued');
  if (!pending) return;

  pending.status = 'processing';
  state.activeRequests++;

  const procTime = Math.floor(Math.random() * 80) + 40;
  setTimeout(() => {
    state.activeRequests = Math.max(0, state.activeRequests - 1);
    state.totalRequests++;

    if (Math.random() < state.faults.failureRate) {
      pending.status = 'failed';
      pending.error = 'Worker task failed execution';
      failedCount++;
      state.errorCount++;
    } else {
      pending.status = 'completed';
      pending.completedAt = new Date().toISOString();
      completedCount++;
    }
  }, procTime);
}, 200);

// Periodically add background periodic cleanup jobs
setInterval(() => {
  if (jobQueue.length > 30) jobQueue.splice(0, 15);
  jobQueue.push({
    id: `job_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    type: 'order_invoice_generation',
    payload: { batchSize: 5 },
    status: 'queued',
    attempts: 1,
    createdAt: new Date().toISOString(),
  });
}, 4000);

// Health
app.get('/health', (_req, res) => {
  res.json(getServiceHealth(state));
});

// Faults
app.post('/faults', (req, res) => {
  if (typeof req.body.latencyMs === 'number') state.faults.latencyMs = req.body.latencyMs;
  if (typeof req.body.failureRate === 'number') state.faults.failureRate = req.body.failureRate;
  if (typeof req.body.isOffline === 'boolean') state.faults.isOffline = req.body.isOffline;
  res.json({ success: true, faults: state.faults });
});

// Jobs
app.get('/api/worker/jobs', (_req, res) => {
  res.json({
    instanceId: INSTANCE_ID,
    queued: jobQueue.filter((j) => j.status === 'queued').length,
    processing: jobQueue.filter((j) => j.status === 'processing').length,
    completed: completedCount,
    failed: failedCount,
    recent: jobQueue.slice(-15),
  });
});

app.post('/api/worker/enqueue', (req, res) => {
  const { type = 'generic_task', payload = {} } = req.body;
  const job: WorkerJob = {
    id: `job_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    type,
    payload,
    status: 'queued',
    attempts: 1,
    createdAt: new Date().toISOString(),
  };
  jobQueue.push(job);
  res.status(202).json({ success: true, job });
});

app.listen(PORT, () => {
  console.log(`[Worker Service] ${INSTANCE_ID} listening on port ${PORT}`);
});
