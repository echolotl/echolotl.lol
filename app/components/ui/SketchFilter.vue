<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    style="position: absolute; width: 0; height: 0; overflow: hidden">
    <defs>
      <filter
        :id="id"
        color-interpolation-filters="sRGB"
        x="-15%"
        y="-15%"
        width="130%"
        height="130%">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.1"
          numOctaves="5"
          result="noise"
          :seed="resolvedSeed" />
        <feGaussianBlur
          in="SourceAlpha"
          :stdDeviation="stdDeviation"
          result="blurred" />
        <feComponentTransfer in="blurred" result="expanded">
          <feFuncA type="linear" slope="500" :intercept="intercept" />
        </feComponentTransfer>
        <feFlood
          :style="{ floodColor, transition: 'flood-color 0.3s ease' }"
          result="color" />
        <feComposite in="color" in2="expanded" operator="in" result="border" />
        <feDisplacementMap
          in="border"
          in2="noise"
          scale="6"
          xChannelSelector="A"
          yChannelSelector="A"
          result="sketchBorder" />
        <feMerge>
          <feMergeNode in="sketchBorder" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
  </svg>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    id: string;
    seed?: number;
    floodColor?: string;
    stdDeviation?: number;
    intercept?: number;
  }>(),
  {
    floodColor: "var(--theme-color, var(--primary))",
    stdDeviation: 2,
    intercept: -5,
  },
);

const resolvedSeed = ref(props.seed ?? 1);

onMounted(() => {
  if (props.seed === undefined) {
    resolvedSeed.value = Math.floor(Math.random() * 20000);
  }
});
</script>
