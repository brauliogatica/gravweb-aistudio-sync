import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

export class FileJobStore {
  constructor(rootDir) {
    this.rootDir = rootDir;
    this.jobsPath = path.join(rootDir, "jobs.json");
  }

  async ensure() {
    await fs.mkdir(this.rootDir, { recursive: true });
    try {
      await fs.access(this.jobsPath);
    } catch {
      await this.writeJobs([]);
    }
  }

  async listJobs() {
    await this.ensure();
    try {
      return JSON.parse(await fs.readFile(this.jobsPath, "utf8"));
    } catch {
      return [];
    }
  }

  async createJob(payload) {
    const now = new Date().toISOString();
    const job = {
      id: `job-${randomUUID()}`,
      userId: payload.userId || "local-dev-user",
      projectId: payload.projectId,
      toolId: payload.toolId,
      runtime: payload.runtime || "backend",
      status: "queued",
      input: payload.input || {},
      outputArtifactIds: [],
      createdAt: now,
      updatedAt: now,
      events: [
        {
          at: now,
          status: "queued",
          message: "Job accepted by V2WEB local orchestrator.",
        },
      ],
    };

    const jobs = await this.listJobs();
    await this.writeJobs([job, ...jobs]);
    return job;
  }

  async getJob(id) {
    const jobs = await this.listJobs();
    return jobs.find((job) => job.id === id) || null;
  }

  async addJobEvent(id, payload) {
    const jobs = await this.listJobs();
    const jobIndex = jobs.findIndex((job) => job.id === id);
    if (jobIndex === -1) return null;

    const now = new Date().toISOString();
    const currentJob = jobs[jobIndex];
    const status = payload.status || currentJob.status || "queued";
    const updatedJob = {
      ...currentJob,
      status,
      updatedAt: now,
      outputArtifactIds: payload.outputArtifactIds || currentJob.outputArtifactIds || [],
      output: payload.output || currentJob.output,
      error: payload.error || currentJob.error,
      events: [
        ...(Array.isArray(currentJob.events) ? currentJob.events : []),
        {
          at: payload.at || now,
          status,
          message: payload.message || "Job event recorded.",
          progress: payload.progress,
          data: payload.data || {},
        },
      ],
    };

    jobs[jobIndex] = updatedJob;
    await this.writeJobs(jobs);
    return updatedJob;
  }

  async writeJobs(jobs) {
    await fs.mkdir(path.dirname(this.jobsPath), { recursive: true });
    const tmpPath = `${this.jobsPath}.tmp`;
    await fs.writeFile(tmpPath, JSON.stringify(jobs, null, 2), "utf8");
    await fs.rename(tmpPath, this.jobsPath);
  }
}
