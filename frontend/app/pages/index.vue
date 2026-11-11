<template>
  <div class="main-page">
    <div class="main-content">
      <h1 class="heading">
        <span class="lotl-font" style="font-size: 2.1rem"
          >Hi, i'm <span class="lotl-font echolotl-text">echolotl</span>!</span
        >
      </h1>
      <div class="subtitle">
        so called "furry artist", hobby coder, cult of the lamb enthusiast
      </div>
      <p>surely one day i'll have something on this dam website</p>
    </div>
    <aside class="sidebar">
      <StatusSection />
    </aside>
  </div>
</template>

<script setup lang="ts">
import StatusSection from "~/components/home/StatusSection.vue";

useSeoMeta({
  title: "echolotl.lol",
  description: "echolotl's personal website, containing their art, characters, and more.",
});
</script>

<style scoped lang="scss">
.heading {
  display: flex;
  flex-wrap: nowrap;
  align-items: baseline;
  white-space: nowrap;
  margin: 0;
}

.main-page {
  display: flex;
  flex-direction: row;
  padding: 2rem;
  padding-top: calc(2rem + 60px);
  max-width: 1200px;
  min-height: 75vh;
  margin: 0 auto;
  z-index: 1;
  @media (max-width: 768px) {
    flex-direction: column;
  }
}

.echolotl-text {
  color: var(--primary);
}

.thinker-shelf {
  position: relative;
  width: 100%;
  height: 16px;
  top: -14px;
  margin-bottom: -14px;
  background: linear-gradient(to bottom, var(--surface), transparent 50%);
  border-bottom: 4px solid var(--distant);
  z-index: -1;
}

.top-overlay {
  width: 100%;
  object-fit: cover;
  height: auto;
  position: absolute;
  top: 0;
  left: 0;
  z-index: 0;
}
.main-content {
  position: relative;
  display: flex;
  flex-direction: column;
  flex: 1;
}
.hi-image {
  mask-image: url("/images/home/hi.webp");
  background-color: var(--text);
  width: 100%;
  height: 200px;
  display: block;
  mask-repeat: no-repeat;
}
.king-image {
  align-self: flex-end;
  max-height: 256px;
  width: auto;
  @media (max-width: 768px) {
    width: 50%;
  }
}

.sidebar {
  width: 250px;
  padding: 0 1rem;
  border-left: 1px dashed var(--distant);

  @media (max-width: 768px) {
    border: none;
  }
}
</style>
