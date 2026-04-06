import dgram from "dgram";
import https from "https";
import { URL } from "url";
import { JobRecord } from "./types";

const DD_API_KEY = process.env.DD_API_KEY || "";
const DD_SITE = process.env.DD_SITE || "datadoghq.com";
const DD_AGENT_HOST = process.env.DD_AGENT_HOST || "localhost";
const DD_DOGSTATSD_PORT = Number(process.env.DD_DOGSTATSD_PORT || 8125);

interface DDEvent {
  title: string;
  text: string;
  alert_type: "info" | "warning" | "error" | "success";
  source_type_name: string;
  tags: string[];
  priority?: "normal" | "low";
}

// ── DogStatsD UDP client ─────────────────────────────────────────────────────

let statsdSocket: dgram.Socket | null = null;

const getStatsdSocket = (): dgram.Socket => {
  if (!statsdSocket) {
    statsdSocket = dgram.createSocket("udp4");
    statsdSocket.unref();
  }
  return statsdSocket;
};

const sendStatsd = (metric: string): void => {
  try {
    const buf = Buffer.from(metric);
    getStatsdSocket().send(buf, 0, buf.length, DD_DOGSTATSD_PORT, DD_AGENT_HOST);
  } catch {
    // DogStatsD is fire-and-forget; swallow send errors
  }
};

const formatTags = (tags: string[]): string =>
  tags.length > 0 ? `|#${tags.join(",")}` : "";

export const incrementCounter = (name: string, tags: string[] = [], value = 1): void => {
  sendStatsd(`${name}:${value}|c${formatTags(tags)}`);
};

export const gauge = (name: string, value: number, tags: string[] = []): void => {
  sendStatsd(`${name}:${value}|g${formatTags(tags)}`);
};

export const histogram = (name: string, value: number, tags: string[] = []): void => {
  sendStatsd(`${name}:${value}|h${formatTags(tags)}`);
};

const sendEvent = (event: DDEvent): void => {
  if (!DD_API_KEY) return;

  const url = new URL(`https://api.${DD_SITE}/api/v1/events`);
  const body = JSON.stringify(event);

  const req = https.request(
    url,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "DD-API-KEY": DD_API_KEY,
        "Content-Length": Buffer.byteLength(body),
      },
    },
    (res) => {
      if (res.statusCode && res.statusCode >= 400) {
        // eslint-disable-next-line no-console
        console.error(`Datadog event API returned ${res.statusCode}`);
      }
    },
  );

  req.on("error", (err) => {
    // eslint-disable-next-line no-console
    console.error("Failed to send Datadog event:", err.message);
  });

  req.write(body);
  req.end();
};

export const notifyDeployStart = (job: JobRecord): void => {
  const params = job.parameters || {};
  const baseTags = [
    "env:production",
    "team:estatewise",
    `deploy_type:${job.type}`,
    `service:${(params.serviceName as string) || "unknown"}`,
    "source:deployment-control",
  ];

  incrementCounter("estatewise.deploy.started", baseTags);

  sendEvent({
    title: `[EstateWise] Deploy started: ${job.type}`,
    text: [
      `**Deployment:** ${job.description}`,
      `**Type:** ${job.type}`,
      `**Job ID:** ${job.id}`,
      params.serviceName ? `**Service:** ${params.serviceName}` : "",
      params.image ? `**Image:** ${params.image}` : "",
      params.namespace ? `**Namespace:** ${params.namespace}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
    alert_type: "info",
    source_type_name: "deployment",
    priority: "normal",
    tags: baseTags,
  });
};

export const notifyDeployFinish = (job: JobRecord): void => {
  const params = job.parameters || {};
  const durationMs =
    job.finishedAt && job.startedAt
      ? job.finishedAt.getTime() - job.startedAt.getTime()
      : 0;
  const durationSec = (durationMs / 1000).toFixed(1);

  const baseTags = [
    "env:production",
    "team:estatewise",
    `deploy_type:${job.type}`,
    `deploy_status:${job.status}`,
    `service:${(params.serviceName as string) || "unknown"}`,
    "source:deployment-control",
  ];

  incrementCounter("estatewise.deploy.finished", baseTags);
  histogram("estatewise.deploy.duration_seconds", durationMs / 1000, baseTags);

  if (job.status === "succeeded") {
    incrementCounter("estatewise.deploy.success", baseTags);
  } else {
    incrementCounter("estatewise.deploy.failure", baseTags);
  }

  sendEvent({
    title: `[EstateWise] Deploy ${job.status}: ${job.type}`,
    text: [
      `**Deployment:** ${job.description}`,
      `**Status:** ${job.status}`,
      `**Duration:** ${durationSec}s`,
      `**Exit Code:** ${job.exitCode ?? "N/A"}`,
      `**Job ID:** ${job.id}`,
      params.serviceName ? `**Service:** ${params.serviceName}` : "",
      job.error ? `**Error:** ${job.error}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
    alert_type: job.status === "succeeded" ? "success" : "error",
    source_type_name: "deployment",
    priority: "normal",
    tags: baseTags,
  });
};

export const isEnabled = (): boolean => DD_API_KEY.length > 0;
