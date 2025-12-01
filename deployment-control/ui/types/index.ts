export interface Deployment {
  name: string;
  readyReplicas: number;
  desiredReplicas: number;
  images?: string[];
}

export interface ClusterSummary {
  namespace: string;
  timestamp: string;
  deployments: Deployment[];
}

export interface Job {
  id: string;
  type: string;
  description: string;
  command: string;
  status: "pending" | "running" | "succeeded" | "failed";
  startedAt?: string;
  finishedAt?: string;
  exitCode?: number | null;
  output: string[];
  parameters?: Record<string, any>;
}

export interface BlueGreenPayload {
  image: string;
  serviceName: string;
  namespace: string;
  autoSwitch: boolean;
  smokeTest: boolean;
  scaleDownOld: boolean;
}

export interface CanaryPayload {
  image: string;
  serviceName: string;
  namespace: string;
  canaryStages: string;
  stageDuration: number;
  autoPromote: boolean;
  enableMetrics: boolean;
  canaryReplicasStart: number;
  stableReplicas: number;
}

export interface RollingPayload {
  serviceName: string;
  namespace: string;
}

export interface ScalePayload {
  serviceName: string;
  namespace: string;
  replicas: number;
  variant?: string;
}
