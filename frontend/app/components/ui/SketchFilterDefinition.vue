<template>
  <filter
    :id="id"
    color-interpolation-filters="sRGB"
    x="-15%"
    y="-15%"
    width="130%"
    height="130%"
  >
    <feTurbulence
      type="fractalNoise"
      baseFrequency="0.1"
      numOctaves="5"
      result="noise"
      :seed="seed"
    />
    <feGaussianBlur
      in="SourceAlpha"
      :stdDeviation="stdDeviation"
      result="blurred"
    />
    <feComponentTransfer in="blurred" result="expanded">
      <feFuncA type="linear" slope="500" :intercept="intercept" />
    </feComponentTransfer>
    <feFlood
      :style="{ floodColor: color, transition: 'flood-color 0.3s ease' }"
      result="color"
    />
    <feComposite in="color" in2="expanded" operator="in" result="border" />
    <feDisplacementMap
      in="border"
      in2="noise"
      scale="6"
      xChannelSelector="A"
      yChannelSelector="A"
      result="sketchBorder"
    />
    <feMerge>
      <feMergeNode in="sketchBorder" />
      <feMergeNode in="SourceGraphic" />
    </feMerge>
  </filter>
</template>

<script setup lang="ts">
import type { SketchFilterDef } from "~/composables/useSketchFilter";

defineProps<SketchFilterDef>();
</script>
