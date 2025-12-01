<template>
  <div class="border border-border rounded-xl p-4 bg-white/5 hover:bg-white/10 transition-colors">
    <div class="flex justify-between items-start mb-3">
      <span class="text-sm text-muted font-mono">{{ deployment.name }}</span>
      <span
        class="badge"
        :class="{
          'badge-success': isHealthy,
          'badge-warning': !isHealthy,
        }"
      >
        {{ isHealthy ? 'healthy' : 'needs attention' }}
      </span>
    </div>

    <h3 class="text-2xl font-bold mb-2">
      <span :class="{ 'text-success': isHealthy, 'text-warning': !isHealthy }">
        {{ deployment.readyReplicas }}
      </span>
      <span class="text-muted"> / {{ deployment.desiredReplicas }}</span>
      <span class="text-sm text-muted ml-1">ready</span>
    </h3>

    <div v-if="deployment.images && deployment.images.length" class="mt-2">
      <p class="text-xs text-muted mb-1">Images:</p>
      <div class="space-y-1">
        <div
          v-for="(image, idx) in deployment.images"
          :key="idx"
          class="text-xs font-mono text-text bg-black/20 px-2 py-1 rounded truncate"
          :title="image"
        >
          {{ image }}
        </div>
      </div>
    </div>

    <div class="mt-3 flex items-center gap-2">
      <div class="flex-1 h-2 bg-black/30 rounded-full overflow-hidden">
        <div
          class="h-full transition-all duration-500"
          :class="{
            'bg-success': isHealthy,
            'bg-warning': !isHealthy,
          }"
          :style="{ width: `${(deployment.readyReplicas / deployment.desiredReplicas) * 100}%` }"
        />
      </div>
      <span class="text-xs text-muted">
        {{ Math.round((deployment.readyReplicas / deployment.desiredReplicas) * 100) }}%
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Deployment } from '~/types';

const props = defineProps<{
  deployment: Deployment;
}>();

const isHealthy = computed(() => {
  return (
    props.deployment.readyReplicas === props.deployment.desiredReplicas &&
    props.deployment.desiredReplicas > 0
  );
});
</script>
