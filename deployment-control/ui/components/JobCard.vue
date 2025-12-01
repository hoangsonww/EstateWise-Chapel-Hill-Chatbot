<template>
  <div class="border border-border rounded-xl p-4 bg-white/5">
    <div class="flex justify-between items-start mb-2">
      <div class="flex-1">
        <h4 class="font-semibold text-text mb-1">{{ job.description }}</h4>
        <p class="text-xs text-muted font-mono">{{ job.command }}</p>
      </div>
      <span
        class="badge ml-3"
        :class="{
          'badge-success': job.status === 'succeeded',
          'badge-danger': job.status === 'failed',
          'badge-warning': job.status === 'running',
          'badge-outline': job.status === 'pending',
        }"
      >
        <span v-if="job.status === 'running'" class="inline-block w-2 h-2 bg-warning rounded-full animate-pulse mr-1" />
        {{ job.status }}
      </span>
    </div>

    <div class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted my-3">
      <span>Started: {{ formatTime(job.startedAt) }}</span>
      <span>Finished: {{ formatTime(job.finishedAt) }}</span>
      <span>Exit: {{ job.exitCode !== null && job.exitCode !== undefined ? job.exitCode : '—' }}</span>
    </div>

    <div v-if="job.parameters && Object.keys(job.parameters).length" class="mb-2">
      <button
        @click="showParams = !showParams"
        class="text-xs text-muted hover:text-text transition-colors flex items-center gap-1"
      >
        <svg
          class="w-3 h-3 transition-transform"
          :class="{ 'rotate-90': showParams }"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
        Parameters
      </button>
      <div v-if="showParams" class="mt-2 text-xs font-mono bg-black/30 p-2 rounded">
        {{ JSON.stringify(job.parameters, null, 2) }}
      </div>
    </div>

    <div class="bg-black/40 border border-border/50 rounded-lg p-3 max-h-48 overflow-auto font-mono text-xs">
      <pre v-if="job.output && job.output.length" class="text-text leading-relaxed whitespace-pre-wrap">{{ job.output.join('\n') }}</pre>
      <p v-else class="text-muted italic">Waiting for output…</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Job } from '~/types';

const props = defineProps<{
  job: Job;
}>();

const showParams = ref(false);

const formatTime = (value?: string) => {
  if (!value) return '—';
  const date = new Date(value);
  return isNaN(date.getTime()) ? '—' : date.toLocaleTimeString();
};
</script>
