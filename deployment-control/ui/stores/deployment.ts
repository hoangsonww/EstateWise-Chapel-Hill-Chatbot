import { defineStore } from "pinia";
import type { ClusterSummary, Job } from "~/types";

export const useDeploymentStore = defineStore("deployment", {
  state: () => ({
    namespace: "estatewise",
    clusterSummary: null as ClusterSummary | null,
    jobs: [] as Job[],
    loading: {
      summary: false,
      jobs: false,
    },
    lastUpdated: {
      summary: null as Date | null,
      jobs: null as Date | null,
    },
  }),

  getters: {
    healthyDeployments: (state) => {
      if (!state.clusterSummary) return 0;
      return state.clusterSummary.deployments.filter(
        (d) => d.readyReplicas === d.desiredReplicas && d.desiredReplicas > 0,
      ).length;
    },

    totalDeployments: (state) => {
      return state.clusterSummary?.deployments?.length || 0;
    },

    recentJobs: (state) => {
      return state.jobs.slice(0, 10);
    },

    runningJobs: (state) => {
      return state.jobs.filter((j) => j.status === "running").length;
    },

    failedJobs: (state) => {
      return state.jobs.filter((j) => j.status === "failed").length;
    },
  },

  actions: {
    async fetchClusterSummary() {
      this.loading.summary = true;
      try {
        const config = useRuntimeConfig();
        const response = await $fetch<ClusterSummary>(
          `${config.public.apiBase}/api/cluster/summary`,
          {
            params: { namespace: this.namespace },
          },
        );
        this.clusterSummary = response;
        this.lastUpdated.summary = new Date();
      } catch (error) {
        console.error("Failed to fetch cluster summary:", error);
        throw error;
      } finally {
        this.loading.summary = false;
      }
    },

    async fetchJobs() {
      this.loading.jobs = true;
      try {
        const config = useRuntimeConfig();
        const response = await $fetch<{ jobs: Job[] }>(
          `${config.public.apiBase}/api/jobs`,
        );
        this.jobs = response.jobs || [];
        this.lastUpdated.jobs = new Date();
      } catch (error) {
        console.error("Failed to fetch jobs:", error);
        throw error;
      } finally {
        this.loading.jobs = false;
      }
    },

    async deployBlueGreen(payload: any) {
      const config = useRuntimeConfig();
      const response = await $fetch<Job>(
        `${config.public.apiBase}/api/deploy/blue-green`,
        {
          method: "POST",
          body: { ...payload, namespace: this.namespace },
        },
      );
      await this.fetchJobs();
      return response;
    },

    async deployCanary(payload: any) {
      const config = useRuntimeConfig();
      const response = await $fetch<Job>(
        `${config.public.apiBase}/api/deploy/canary`,
        {
          method: "POST",
          body: { ...payload, namespace: this.namespace },
        },
      );
      await this.fetchJobs();
      return response;
    },

    async rollingRestart(payload: any) {
      const config = useRuntimeConfig();
      const response = await $fetch<Job>(
        `${config.public.apiBase}/api/deploy/rolling`,
        {
          method: "POST",
          body: { ...payload, namespace: this.namespace },
        },
      );
      await this.fetchJobs();
      return response;
    },

    async scaleDeployment(payload: any) {
      const config = useRuntimeConfig();
      const response = await $fetch<Job>(
        `${config.public.apiBase}/api/ops/scale`,
        {
          method: "POST",
          body: { ...payload, namespace: this.namespace },
        },
      );
      await this.fetchJobs();
      return response;
    },

    setNamespace(namespace: string) {
      this.namespace = namespace;
    },
  },
});
