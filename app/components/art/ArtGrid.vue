<template>
  <div v-if="artworks.length > 0" class="art-grid grid-auto-fill">
    <ArtItem
      v-for="artwork in artworks"
      :key="artwork.slug"
      :artwork="artwork"
      :show-metadata="showMetadata"
      :show-character-badge="showCharacterBadge"
      :outline-color="outlineColor"
      @age-gate="openAgeGate(artwork.slug)"
    />
    <AgeGateModal
      v-model="ageGateOpen"
      @confirm="onAgeConfirmed"
      @deny="pendingSlug = null"
    />
  </div>
  <p
    v-else
    style="color: var(--text-secondary); text-align: center; width: 100%"
  >
    No artworks found! Try adjusting your filters?
  </p>
</template>

<script setup lang="ts">
import type { Art } from "~~/types";
import ArtItem from "~/components/art/ArtItem.vue";
import AgeGateModal from "~/components/art/AgeGateModal.vue";
import { useAgeVerification } from "../../composables/useAgeVerification";

defineProps<{
  artworks: Art[];
  showMetadata?: boolean;
  showCharacterBadge?: boolean;
  outlineColor?: string;
}>();

const { init } = useAgeVerification();
onMounted(init);

const ageGateOpen = ref(false);
const pendingSlug = ref<string | null>(null);

function openAgeGate(slug: string) {
  pendingSlug.value = slug;
  ageGateOpen.value = true;
}

function onAgeConfirmed() {
  if (pendingSlug.value) navigateTo(`/art/${pendingSlug.value}`);
  pendingSlug.value = null;
}
</script>
