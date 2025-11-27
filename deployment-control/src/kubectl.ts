import { spawn } from 'child_process';
import path from 'path';
import {
  ClusterDeploymentSummary,
  ClusterServiceSummary,
  ClusterSummary,
} from './types';

export const repoRoot = path.resolve(__dirname, '..', '..');
export const scriptsDir = path.join(repoRoot, 'kubernetes', 'scripts');

const kubectlBinary = (): string => process.env.KUBECTL || 'kubectl';

export const runKubectl = async (
  args: string[],
  namespace?: string
): Promise<string> =>
  new Promise((resolve, reject) => {
    const finalArgs = [...args];
    if (namespace) {
      finalArgs.push('-n', namespace);
    }

    const child = spawn(kubectlBinary(), finalArgs, {
      env: process.env,
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data: Buffer) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    child.on('error', (error: Error) => {
      reject(error);
    });

    child.on('close', (code: number | null) => {
      if (code === 0) {
        resolve(stdout.trim());
      } else {
        reject(new Error(stderr.trim() || `kubectl exited with code ${code}`));
      }
    });
  });

export const getClusterSummary = async (
  namespace = 'estatewise'
): Promise<ClusterSummary> => {
  const deploymentsJson = await runKubectl(
    ['get', 'deployments', '-o', 'json'],
    namespace
  );
  const servicesJson = await runKubectl(
    ['get', 'service', '-o', 'json'],
    namespace
  );

  const deploymentsRaw = JSON.parse(deploymentsJson);
  const servicesRaw = JSON.parse(servicesJson);

  const deployments: ClusterDeploymentSummary[] =
    deploymentsRaw.items?.map((item: any) => ({
      name: item?.metadata?.name ?? 'unknown',
      readyReplicas: Number(item?.status?.readyReplicas ?? 0),
      availableReplicas: Number(item?.status?.availableReplicas ?? 0),
      desiredReplicas: Number(item?.spec?.replicas ?? 0),
      images:
        item?.spec?.template?.spec?.containers
          ?.map((container: any) => container?.image)
          .filter(Boolean) ?? [],
    })) ?? [];

  const services: ClusterServiceSummary[] =
    servicesRaw.items?.map((svc: any) => ({
      name: svc?.metadata?.name ?? 'unknown',
      type: svc?.spec?.type ?? 'ClusterIP',
      clusterIP: svc?.spec?.clusterIP ?? 'n/a',
    })) ?? [];

  return {
    namespace,
    deployments,
    services,
    timestamp: new Date().toISOString(),
  };
};
