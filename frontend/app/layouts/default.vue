<template>
  <div data-app-content :class="{ 'light-theme': theme }">
    <a class="skip-link" href="#main-content">Skip to main content</a>
    <Navbar :light="theme" @toggle-theme="toggleTheme" />
    <main id="main-content" tabindex="-1">
      <slot />
    </main>
    <Footer />
  </div>
</template>

<script setup lang="ts">
import Navbar from "~/components/layout/Navbar.vue";
import Footer from "~/components/layout/Footer.vue";
import { useTheme } from "~/composables/useTheme";

const { theme, toggleTheme, initializeTheme, cleanupTheme } = useTheme();

const route = useRoute();

onMounted(() => {
  initializeTheme();
});

onUnmounted(() => {
  cleanupTheme();
});

useSeoMeta({
  ogSiteName: "echolotl.lol",
  description:
    "echolotl's personal website, containing their art, characters, and more.",
  ogType: "website",
  ogLocale: "en_US",
  ogTitle: "echolotl",
  themeColor: "#DA39A4",
  ogUrl: "https://www.echolotl.lol" + route.fullPath,
});
</script>
