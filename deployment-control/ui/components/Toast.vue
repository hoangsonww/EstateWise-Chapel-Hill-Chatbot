<template>
  <Teleport to="body">
    <Transition name="slide">
      <div
        v-if="show"
        class="fixed bottom-6 right-6 bg-bg-2 text-text px-4 py-3 rounded-xl border border-border shadow-glow z-50 slide-in-up max-w-md"
        role="status"
        aria-live="polite"
      >
        <div class="flex items-center gap-3">
          <div
            class="flex-shrink-0 w-2 h-2 rounded-full"
            :class="{
              'bg-success': type === 'success',
              'bg-danger': type === 'error',
              'bg-warning': type === 'warning',
              'bg-accent-2': type === 'info',
            }"
          />
          <p class="text-sm">{{ message }}</p>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
const show = ref(false);
const message = ref('');
const type = ref<'success' | 'error' | 'warning' | 'info'>('info');
let timeout: NodeJS.Timeout;

const showToast = (msg: string, toastType: typeof type.value = 'info', duration = 3000) => {
  message.value = msg;
  type.value = toastType;
  show.value = true;

  clearTimeout(timeout);
  timeout = setTimeout(() => {
    show.value = false;
  }, duration);
};

defineExpose({ showToast });
</script>

<style scoped>
.slide-enter-active,
.slide-leave-active {
  transition: all 0.3s ease;
}

.slide-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
