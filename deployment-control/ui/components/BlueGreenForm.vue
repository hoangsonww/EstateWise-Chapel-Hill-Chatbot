<template>
  <form @submit.prevent="handleSubmit" class="space-y-4">
    <div>
      <label class="block text-sm text-muted mb-2">Container image</label>
      <input
        v-model="form.image"
        type="text"
        placeholder="ghcr.io/your-org/estatewise-app-backend:v1.2.3"
        class="input"
        required
      />
    </div>

    <div class="grid grid-cols-2 gap-4">
      <div>
        <label class="block text-sm text-muted mb-2">Service name</label>
        <input v-model="form.serviceName" type="text" class="input" />
      </div>
      <div>
        <label class="block text-sm text-muted mb-2">Namespace</label>
        <input v-model="form.namespace" type="text" class="input" />
      </div>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <label class="flex items-center gap-2 bg-white/5 border border-border px-3 py-2.5 rounded-xl cursor-pointer hover:bg-white/10 transition-colors">
        <input v-model="form.autoSwitch" type="checkbox" class="rounded" />
        <span class="text-sm">Auto switch traffic</span>
      </label>
      <label class="flex items-center gap-2 bg-white/5 border border-border px-3 py-2.5 rounded-xl cursor-pointer hover:bg-white/10 transition-colors">
        <input v-model="form.smokeTest" type="checkbox" class="rounded" />
        <span class="text-sm">Run smoke test</span>
      </label>
      <label class="flex items-center gap-2 bg-white/5 border border-border px-3 py-2.5 rounded-xl cursor-pointer hover:bg-white/10 transition-colors">
        <input v-model="form.scaleDownOld" type="checkbox" class="rounded" />
        <span class="text-sm">Scale down old slot</span>
      </label>
    </div>

    <button type="submit" :disabled="loading" class="btn-primary w-full">
      <span v-if="loading" class="flex items-center justify-center gap-2">
        <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        Launching...
      </span>
      <span v-else>Launch Blue/Green</span>
    </button>
  </form>
</template>

<script setup lang="ts">
import { useDeploymentStore } from '~/stores/deployment';

const emit = defineEmits(['success', 'error']);
const store = useDeploymentStore();

const loading = ref(false);
const form = reactive({
  image: '',
  serviceName: 'backend',
  namespace: store.namespace,
  autoSwitch: false,
  smokeTest: false,
  scaleDownOld: false,
});

watch(() => store.namespace, (newVal) => {
  form.namespace = newVal;
});

const handleSubmit = async () => {
  loading.value = true;
  try {
    await store.deployBlueGreen(form);
    emit('success', 'Blue/Green deployment kicked off successfully');
    form.image = '';
    form.autoSwitch = false;
    form.smokeTest = false;
    form.scaleDownOld = false;
  } catch (error: any) {
    emit('error', error.message || 'Failed to start Blue/Green deployment');
  } finally {
    loading.value = false;
  }
};
</script>
