<script setup lang="ts">
const props = defineProps<{
  href?: string
}>();
</script>

<template>
  <div class="absolute bottom-5 right-14 text-xs opacity-60">
    <a :href="props.href">
      <slot>
        {{ props.href }}
      </slot>
    </a>
  </div>
</template>
