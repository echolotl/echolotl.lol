<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    style="position: absolute; width: 0; height: 0; overflow: hidden">
    <defs>
      <filter
        v-for="f in filters"
        :id="f.id"
        :key="f.id"
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
          :seed="f.seed" />
        <feGaussianBlur
          in="SourceAlpha"
          :stdDeviation="f.stdDeviation"
          result="blurred" />
        <feComponentTransfer in="blurred" result="expanded">
          <feFuncA type="linear" slope="500" :intercept="f.intercept" />
        </feComponentTransfer>
        <feFlood
          :style="{ floodColor: f.color, transition: 'flood-color 0.3s ease' }"
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
import type { SketchFilterDef } from "~/composables/useSketchFilter";

const filters = useState<Record<string, SketchFilterDef>>(
  "sketch-filters",
  () => ({}),
);
</script>
