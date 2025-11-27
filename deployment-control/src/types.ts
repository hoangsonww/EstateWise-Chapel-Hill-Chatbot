export type JobType =
  | 'blue-green'
  | 'canary'
  | 'rolling'
  | 'scale'
  | 'cluster-status';

export type JobStatus = 'queued' | 'running' | 'succeeded' | 'failed';

export interface JobRecord {
  id: string;
  type: JobType;
  description: string;
  command: string;
  status: JobStatus;
  createdAt: Date;
  startedAt?: Date;
  finishedAt?: Date;
  output: string[];
  exitCode?: number | null;
  parameters?: Record<string, unknown>;
  error?: string;
}

export interface JobResponse {
  id: string;
  type: JobType;
  description: string;
  command: string;
  status: JobStatus;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
  output: string[];
  exitCode?: number | null;
  parameters?: Record<string, unknown>;
  error?: string;
}

export interface ClusterDeploymentSummary {
  name: string;
  readyReplicas: number;
  availableReplicas: number;
  desiredReplicas: number;
  images: string[];
}

export interface ClusterServiceSummary {
  name: string;
  type: string;
  clusterIP: string;
}

export interface ClusterSummary {
  namespace: string;
  deployments: ClusterDeploymentSummary[];
  services: ClusterServiceSummary[];
  timestamp: string;
}
