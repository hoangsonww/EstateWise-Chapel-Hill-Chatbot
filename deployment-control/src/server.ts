import cors from "cors";
import express, { Request, Response } from "express";
import path from "path";
import { findJob, listJobs, runJob } from "./jobRunner";
import { getClusterSummary, repoRoot, scriptsDir } from "./kubectl";

const app = express();
const port = Number(process.env.PORT || 4100);

app.use(cors());
app.use(express.json({ limit: "1mb" }));

// UI is now served separately via Nuxt (port 3000)
// This API server only handles backend requests

app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

app.get("/api/jobs", (req: Request, res: Response) => {
  const limit = req.query.limit ? Number(req.query.limit) : 50;
  res.json({ jobs: listJobs(limit) });
});

app.get("/api/jobs/:id", (req: Request, res: Response) => {
  const job = findJob(req.params.id);
  if (!job) {
    res.status(404).json({ error: "Job not found" });
    return;
  }

  res.json(job);
});

app.post("/api/deploy/blue-green", (req: Request, res: Response) => {
  const {
    serviceName = "backend",
    image,
    namespace = "estatewise",
    autoSwitch = false,
    smokeTest = false,
    scaleDownOld = false,
  } = req.body || {};

  if (!image) {
    res.status(400).json({ error: "image is required" });
    return;
  }

  const script = path.join(scriptsDir, "blue-green-deploy.sh");
  const job = runJob({
    type: "blue-green",
    description: `Blue/Green: ${serviceName} -> ${image}`,
    command: script,
    args: [serviceName, image],
    cwd: repoRoot,
    env: {
      NAMESPACE: namespace,
      AUTO_SWITCH: autoSwitch ? "true" : "false",
      SMOKE_TEST: smokeTest ? "true" : "false",
      SCALE_DOWN_OLD: scaleDownOld ? "true" : "false",
    },
    parameters: {
      serviceName,
      image,
      namespace,
      autoSwitch,
      smokeTest,
      scaleDownOld,
    },
  });

  res.status(202).json(job);
});

app.post("/api/deploy/canary", (req: Request, res: Response) => {
  const {
    serviceName = "backend",
    image,
    namespace = "estatewise",
    canaryStages = "10,25,50,75,100",
    stageDuration = 120,
    autoPromote = false,
    enableMetrics = false,
    canaryReplicasStart = 1,
    stableReplicas = 2,
  } = req.body || {};

  if (!image) {
    res.status(400).json({ error: "image is required" });
    return;
  }

  const script = path.join(scriptsDir, "canary-deploy.sh");
  const job = runJob({
    type: "canary",
    description: `Canary: ${serviceName} -> ${image} (${canaryStages}%)`,
    command: script,
    args: [serviceName, image],
    cwd: repoRoot,
    env: {
      NAMESPACE: namespace,
      CANARY_STAGES: String(canaryStages),
      STAGE_DURATION: String(stageDuration),
      AUTO_PROMOTE: autoPromote ? "true" : "false",
      ENABLE_METRICS: enableMetrics ? "true" : "false",
      CANARY_REPLICAS_START: String(canaryReplicasStart),
      STABLE_REPLICAS: String(stableReplicas),
    },
    parameters: {
      serviceName,
      image,
      namespace,
      canaryStages,
      stageDuration,
      autoPromote,
      enableMetrics,
      canaryReplicasStart,
      stableReplicas,
    },
  });

  res.status(202).json(job);
});

app.post("/api/deploy/rolling", (req: Request, res: Response) => {
  const {
    serviceName = "backend",
    namespace = "estatewise",
    kubectl = process.env.KUBECTL || "kubectl",
  } = req.body || {};

  const command = `${kubectl} rollout restart deployment/estatewise-${serviceName} -n ${namespace} && ${kubectl} rollout status deployment/estatewise-${serviceName} -n ${namespace}`;

  const job = runJob({
    type: "rolling",
    description: `Rolling restart: ${serviceName}`,
    command: "bash",
    args: ["-lc", command],
    cwd: repoRoot,
    env: { KUBECTL: kubectl },
    parameters: { serviceName, namespace, kubectl },
  });

  res.status(202).json(job);
});

app.post("/api/ops/scale", (req: Request, res: Response) => {
  const {
    serviceName = "backend",
    namespace = "estatewise",
    replicas,
    variant,
    kubectl = process.env.KUBECTL || "kubectl",
  } = req.body || {};

  if (replicas === undefined || replicas === null) {
    res.status(400).json({ error: "replicas is required" });
    return;
  }

  const deploymentName = variant
    ? `estatewise-${serviceName}-${variant}`
    : `estatewise-${serviceName}`;

  const command = `${kubectl} scale deployment/${deploymentName} --replicas=${replicas} -n ${namespace}`;

  const job = runJob({
    type: "scale",
    description: `Scale ${deploymentName} -> ${replicas}`,
    command: "bash",
    args: ["-lc", command],
    cwd: repoRoot,
    env: { KUBECTL: kubectl },
    parameters: { serviceName, namespace, replicas, variant },
  });

  res.status(202).json(job);
});

app.get("/api/cluster/summary", async (req: Request, res: Response) => {
  const namespace = (req.query.namespace as string) || "estatewise";
  try {
    const summary = await getClusterSummary(namespace);
    res.json(summary);
  } catch (error: unknown) {
    res.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch cluster summary",
    });
  }
});

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Deployment Control API running on http://localhost:${port}`);
  // eslint-disable-next-line no-console
  console.log(
    `UI available at http://localhost:3000 (run 'cd ui && npm run dev')`,
  );
});
