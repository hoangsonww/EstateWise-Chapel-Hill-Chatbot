<template>
  <div class="min-h-screen pb-12">
    <div class="background-glow" />

    <header class="relative z-10 max-w-7xl mx-auto px-6 pt-12 pb-6">
      <div class="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div class="flex-1">
          <p class="eyebrow mb-2">EstateWise Delivery</p>
          <h1 class="text-4xl lg:text-5xl font-bold mb-3 tracking-tight">
            Deployment Control
          </h1>
          <p class="text-muted max-w-2xl leading-relaxed">
            Operate blue/green, canary, and rolling updates without touching the CLI. Track live jobs, inspect cluster state, and ship with confidence.
          </p>
          <div class="flex items-center gap-3 mt-4">
            <button @click="refreshAll" :disabled="loading" class="btn-ghost btn-sm">
              <svg v-if="loading" class="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>Refresh cluster</span>
            </button>
            <span class="text-sm text-muted">
              {{ summaryStatus }}
            </span>
          </div>
        </div>

        <div class="bg-gradient-to-br from-accent/10 to-accent-2/10 border border-border rounded-2xl p-5 min-w-[260px] shadow-glow backdrop-blur-sm">
          <div class="space-y-3">
            <div>
              <p class="text-xs text-muted mb-1.5">Namespace</p>
              <input
                v-model="store.namespace"
                type="text"
                class="input text-sm"
                aria-label="Namespace"
              />
            </div>
            <div>
              <p class="text-xs text-muted mb-1.5">Kube Context</p>
              <span class="badge badge-outline text-xs">uses local kubectl</span>
            </div>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
        <div class="bg-panel/50 border border-border rounded-xl p-4">
          <p class="text-xs text-muted mb-1">Deployments</p>
          <p class="text-2xl font-bold">
            <span class="text-success">{{ store.healthyDeployments }}</span>
            <span class="text-muted text-lg"> / {{ store.totalDeployments }}</span>
          </p>
        </div>
        <div class="bg-panel/50 border border-border rounded-xl p-4">
          <p class="text-xs text-muted mb-1">Running Jobs</p>
          <p class="text-2xl font-bold text-warning">{{ store.runningJobs }}</p>
        </div>
        <div class="bg-panel/50 border border-border rounded-xl p-4">
          <p class="text-xs text-muted mb-1">Failed Jobs</p>
          <p class="text-2xl font-bold text-danger">{{ store.failedJobs }}</p>
        </div>
        <div class="bg-panel/50 border border-border rounded-xl p-4">
          <p class="text-xs text-muted mb-1">Last Update</p>
          <p class="text-sm text-text">{{ lastUpdateTime }}</p>
        </div>
      </div>
    </header>

    <main class="relative z-10 max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
      <section class="panel">
        <div class="flex justify-between items-center mb-4">
          <div>
            <p class="eyebrow mb-1">Live cluster</p>
            <h2 class="text-2xl font-bold">Deployment health</h2>
          </div>
          <button @click="store.fetchClusterSummary()" class="btn-ghost btn-sm">
            Refresh
          </button>
        </div>

        <div v-if="store.loading.summary" class="text-center py-12">
          <svg class="animate-spin h-8 w-8 mx-auto text-accent" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>

        <div v-else-if="!store.clusterSummary || !store.clusterSummary.deployments?.length" class="text-center py-12 text-muted">
          <p>No deployments in this namespace</p>
        </div>

        <div v-else class="grid grid-cols-1 gap-3">
          <DeploymentCard
            v-for="deployment in store.clusterSummary.deployments"
            :key="deployment.name"
            :deployment="deployment"
          />
        </div>
      </section>

      <section class="panel">
        <div class="flex justify-between items-start mb-4">
          <div>
            <p class="eyebrow mb-1">Blue / Green</p>
            <h2 class="text-2xl font-bold">Swap traffic safely</h2>
          </div>
          <div class="pill pill-soft text-xs">Zero downtime</div>
        </div>
        <BlueGreenForm @success="onSuccess" @error="onError" />
      </section>

      <section class="panel">
        <div class="flex justify-between items-start mb-4">
          <div>
            <p class="eyebrow mb-1">Canary</p>
            <h2 class="text-2xl font-bold">Progressive delivery</h2>
          </div>
          <div class="pill pill-accent text-xs">Guarded rollout</div>
        </div>
        <CanaryForm @success="onSuccess" @error="onError" />
      </section>

      <section class="panel">
        <div class="flex justify-between items-start mb-4">
          <div>
            <p class="eyebrow mb-1">Ops</p>
            <h2 class="text-2xl font-bold">Quick controls</h2>
          </div>
          <div class="pill pill-outline text-xs">Kubernetes native</div>
        </div>

        <div class="space-y-4">
          <div class="border border-border rounded-xl p-4 bg-white/5">
            <div class="mb-3">
              <p class="text-xs text-muted mb-1">Rolling restart</p>
              <h3 class="font-semibold">Restart deployment</h3>
            </div>
            <form @submit.prevent="handleRollingRestart" class="flex gap-2">
              <input v-model="rollingForm.serviceName" type="text" class="input flex-1" placeholder="Service name" />
              <button type="submit" :disabled="rollingLoading" class="btn-ghost">
                Restart
              </button>
            </form>
          </div>

          <div class="border border-border rounded-xl p-4 bg-white/5">
            <div class="mb-3">
              <p class="text-xs text-muted mb-1">Scale</p>
              <h3 class="font-semibold">Adjust replicas</h3>
            </div>
            <form @submit.prevent="handleScale" class="grid grid-cols-2 gap-2">
              <input v-model="scaleForm.serviceName" type="text" class="input" placeholder="Service" />
              <input v-model.number="scaleForm.replicas" type="number" min="0" class="input" placeholder="Replicas" />
              <input v-model="scaleForm.variant" type="text" class="input col-span-2" placeholder="Variant (optional: stable/blue/green/canary)" />
              <button type="submit" :disabled="scaleLoading" class="btn-ghost col-span-2">
                Scale
              </button>
            </form>
          </div>
        </div>
      </section>

      <section class="panel lg:col-span-2">
        <div class="flex justify-between items-center mb-4">
          <div>
            <p class="eyebrow mb-1">Activity</p>
            <h2 class="text-2xl font-bold">Job feed</h2>
          </div>
          <button @click="store.fetchJobs()" class="btn-ghost btn-sm">
            Refresh
          </button>
        </div>

        <div v-if="store.loading.jobs" class="text-center py-12">
          <svg class="animate-spin h-8 w-8 mx-auto text-accent" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>

        <div v-else-if="!store.jobs.length" class="text-center py-12 text-muted">
          <p>No jobs yet. Kick off a deployment to see activity.</p>
        </div>

        <div v-else class="space-y-4">
          <JobCard v-for="job in store.recentJobs" :key="job.id" :job="job" />
        </div>
      </section>
    </main>

    <Toast ref="toast" />
  </div>
</template>

<script setup lang="ts">
import { useDeploymentStore } from '~/stores/deployment';

const store = useDeploymentStore();
const toast = ref<any>(null);
const loading = ref(false);
const rollingLoading = ref(false);
const scaleLoading = ref(false);

const rollingForm = reactive({
  serviceName: 'backend',
});

const scaleForm = reactive({
  serviceName: 'backend',
  replicas: 3,
  variant: '',
});

const summaryStatus = computed(() => {
  if (store.loading.summary) return 'Loading...';
  if (!store.lastUpdated.summary) return 'Awaiting data…';
  return `Updated ${store.lastUpdated.summary.toLocaleTimeString()} · ${store.namespace}`;
});

const lastUpdateTime = computed(() => {
  if (!store.lastUpdated.jobs) return '—';
  return store.lastUpdated.jobs.toLocaleTimeString();
});

const refreshAll = async () => {
  loading.value = true;
  try {
    await Promise.all([
      store.fetchClusterSummary(),
      store.fetchJobs(),
    ]);
    toast.value?.showToast('Cluster data refreshed', 'success');
  } catch (error) {
    toast.value?.showToast('Failed to refresh cluster data', 'error');
  } finally {
    loading.value = false;
  }
};

const handleRollingRestart = async () => {
  rollingLoading.value = true;
  try {
    await store.rollingRestart(rollingForm);
    toast.value?.showToast('Rolling restart initiated', 'success');
  } catch (error: any) {
    toast.value?.showToast(error.message || 'Failed to restart', 'error');
  } finally {
    rollingLoading.value = false;
  }
};

const handleScale = async () => {
  scaleLoading.value = true;
  try {
    await store.scaleDeployment(scaleForm);
    toast.value?.showToast('Scaling operation initiated', 'success');
  } catch (error: any) {
    toast.value?.showToast(error.message || 'Failed to scale', 'error');
  } finally {
    scaleLoading.value = false;
  }
};

const onSuccess = (message: string) => {
  toast.value?.showToast(message, 'success');
};

const onError = (message: string) => {
  toast.value?.showToast(message, 'error');
};

onMounted(() => {
  refreshAll();
  const interval = setInterval(() => {
    store.fetchJobs();
  }, 6000);

  onUnmounted(() => {
    clearInterval(interval);
  });
});
</script>
