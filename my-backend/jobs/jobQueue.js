/**
 * Job Queue - Simple in-memory queue with Redis backend option
 * 
 * For production, consider using:
 * - Bull (Redis-based)
 * - Agenda (MongoDB-based)
 * - AWS SQS
 */

const redis = require('../lib/redis');

// In-memory queue for development
const memoryQueue = [];
const jobHandlers = new Map();

// Job status tracking
const JOB_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed'
};

/**
 * Register a job handler
 */
function registerHandler(jobType, handler) {
  jobHandlers.set(jobType, handler);
  console.log(`[JobQueue] Registered handler for: ${jobType}`);
}

/**
 * Enqueue a job
 */
async function enqueueJob(jobType, payload, options = {}) {
  const job = {
    id: `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: jobType,
    payload,
    status: JOB_STATUS.PENDING,
    attempts: 0,
    maxAttempts: options.maxAttempts || 3,
    delay: options.delay || 0,
    createdAt: new Date().toISOString(),
    scheduledAt: options.delay 
      ? new Date(Date.now() + options.delay).toISOString() 
      : new Date().toISOString()
  };

  if (redis) {
    // Use Redis queue
    try {
      await redis.lpush('job_queue', JSON.stringify(job));
      await redis.hset(`job:${job.id}`, 'status', JOB_STATUS.PENDING);
      console.log(`[JobQueue] Enqueued job ${job.id} (${jobType}) to Redis`);
    } catch (error) {
      console.error('[JobQueue] Redis error, falling back to memory:', error.message);
      memoryQueue.push(job);
    }
  } else {
    // Use in-memory queue
    memoryQueue.push(job);
    console.log(`[JobQueue] Enqueued job ${job.id} (${jobType}) to memory`);
  }

  // Process immediately if no delay (for development)
  if (!options.delay && process.env.NODE_ENV !== 'production') {
    setImmediate(() => processJob(job));
  }

  return job.id;
}

/**
 * Process a single job
 */
async function processJob(job) {
  const handler = jobHandlers.get(job.type);
  
  if (!handler) {
    console.warn(`[JobQueue] No handler for job type: ${job.type}`);
    return;
  }

  job.status = JOB_STATUS.PROCESSING;
  job.attempts++;
  job.startedAt = new Date().toISOString();

  try {
    console.log(`[JobQueue] Processing job ${job.id} (${job.type}), attempt ${job.attempts}`);
    
    await handler(job.payload);
    
    job.status = JOB_STATUS.COMPLETED;
    job.completedAt = new Date().toISOString();
    
    console.log(`[JobQueue] Completed job ${job.id} (${job.type})`);

    // Update status in Redis
    if (redis) {
      await redis.hset(`job:${job.id}`, 'status', JOB_STATUS.COMPLETED);
    }

  } catch (error) {
    console.error(`[JobQueue] Job ${job.id} failed:`, error.message);
    
    job.lastError = error.message;
    
    if (job.attempts < job.maxAttempts) {
      // Retry with exponential backoff
      const delay = Math.pow(2, job.attempts) * 1000;
      job.status = JOB_STATUS.PENDING;
      job.scheduledAt = new Date(Date.now() + delay).toISOString();
      
      console.log(`[JobQueue] Retrying job ${job.id} in ${delay}ms`);
      
      setTimeout(() => processJob(job), delay);
    } else {
      job.status = JOB_STATUS.FAILED;
      job.failedAt = new Date().toISOString();
      
      console.error(`[JobQueue] Job ${job.id} permanently failed after ${job.attempts} attempts`);

      // Update status in Redis
      if (redis) {
        await redis.hset(`job:${job.id}`, 'status', JOB_STATUS.FAILED);
      }
    }
  }
}

/**
 * Start the job queue worker
 */
async function startWorker(pollInterval = 5000) {
  console.log('[JobQueue] Starting worker...');

  const processQueue = async () => {
    try {
      let job = null;

      if (redis) {
        // Get job from Redis
        const jobJson = await redis.rpop('job_queue');
        if (jobJson) {
          job = JSON.parse(jobJson);
        }
      } else {
        // Get job from memory
        job = memoryQueue.shift();
      }

      if (job) {
        // Check if it's time to process
        const scheduledTime = new Date(job.scheduledAt).getTime();
        if (scheduledTime <= Date.now()) {
          await processJob(job);
        } else {
          // Put it back if not ready
          if (redis) {
            await redis.lpush('job_queue', JSON.stringify(job));
          } else {
            memoryQueue.unshift(job);
          }
        }
      }
    } catch (error) {
      console.error('[JobQueue] Worker error:', error);
    }

    // Continue polling
    setTimeout(processQueue, pollInterval);
  };

  processQueue();
}

/**
 * Get job status
 */
async function getJobStatus(jobId) {
  if (redis) {
    const status = await redis.hget(`job:${jobId}`, 'status');
    return status || JOB_STATUS.PENDING;
  }
  
  const job = memoryQueue.find(j => j.id === jobId);
  return job?.status || JOB_STATUS.PENDING;
}

module.exports = {
  registerHandler,
  enqueueJob,
  startWorker,
  getJobStatus,
  JOB_STATUS
};
