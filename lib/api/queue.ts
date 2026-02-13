
import { GenerateRequest } from "./schemas";

export interface Job {
    id: string;
    request: GenerateRequest;
    timestamp: number;
    resolve: (response: any) => void;
    reject: (error: any) => void;
}

export class InternalQueue {
    private pendingJobs: Map<string, Job> = new Map();
    private queue: string[] = []; // Order of IDs
    private lastWorkerHeartbeat = 0;
    // Explicit connection state to prevent race conditions with polling
    private isConnected = false;

    constructor() {
        this.lastWorkerHeartbeat = 0;
        this.isConnected = false;
    }

    connect() {
        console.log("Worker explicitly connected");
        this.isConnected = true;
        this.lastWorkerHeartbeat = Date.now();
    }

    disconnect() {
        console.log("Worker explicitly disconnected");
        this.isConnected = false;
        this.lastWorkerHeartbeat = 0;

        // Reject all pending jobs immediately
        this.clearQueue();
    }

    registerHeartbeat() {
        if (this.isConnected) {
            this.lastWorkerHeartbeat = Date.now();
        }
    }

    // Deprecated for direct use, use connect/disconnect/registerHeartbeat
    registerWorker() {
        this.registerHeartbeat();
    }

    unregisterWorker() {
        this.disconnect();
    }

    isWorkerActive() {
        // Must be explicitly connected AND have recent heartbeat
        return this.isConnected && (Date.now() - this.lastWorkerHeartbeat < 15000);
    }

    clearQueue() {
        for (const id of this.queue) {
            const job = this.pendingJobs.get(id);
            if (job) {
                job.reject(new Error("Worker disconnected while processing or queued"));
            }
        }
        this.pendingJobs.clear();
        this.queue = [];
    }

    addJob(request: GenerateRequest): Promise<any> {
        if (!this.isWorkerActive()) {
            return Promise.reject(new Error("API Access is disabled or worker is not connected. Please enable it in the browser."));
        }

        const id = crypto.randomUUID();

        return new Promise((resolve, reject) => {
            const job: Job = {
                id,
                request,
                timestamp: Date.now(),
                resolve,
                reject,
            };

            this.pendingJobs.set(id, job);
            this.queue.push(id);

            console.log(`Job ${id} added to queue. Queue size: ${this.queue.length}`);

            // Cleanup timeout (60s)
            setTimeout(() => {
                const currentJob = this.pendingJobs.get(id);
                if (currentJob) {
                    currentJob.reject(new Error("Request timed out waiting for processing"));
                    this.pendingJobs.delete(id);
                    this.queue = this.queue.filter(qId => qId !== id);
                }
            }, 60000);
        });
    }

    /**
     * Called by the worker polling endpoint to get the next job
     */
    getNextJob(): { id: string; request: GenerateRequest } | null {
        // Only update heartbeat if we are supposed to be connected.
        // If isConnected is false, this poll is likely a straggler from a disabled client
        // and should NOT re-enable the queue.
        if (!this.isConnected) {
            return null;
        }

        this.registerHeartbeat();

        if (this.queue.length === 0) return null;

        const id = this.queue.shift();
        if (!id) return null;

        const job = this.pendingJobs.get(id);
        if (!job) return null;

        return { id: job.id, request: job.request };
    }

    /**
     * Called by the worker result endpoint to complete a job
     */
    completeJob(id: string, result: any, error?: string) {
        const job = this.pendingJobs.get(id);

        if (job) {
            if (error) {
                job.reject(new Error(error));
            } else {
                job.resolve(result);
            }
            this.pendingJobs.delete(id);
            return true;
        }
        return false;
    }

    getPendingCount() {
        return this.queue.length;
    }
}

// Global singleton for Next.js dev server hot reload persistence
const globalForQueue = globalThis as unknown as { jobQueue: InternalQueue };

export const jobQueue = globalForQueue.jobQueue || new InternalQueue();

if (process.env.NODE_ENV !== "production") globalForQueue.jobQueue = jobQueue;
