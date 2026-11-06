<template>
  <div class="art-page">
    <h1 class="art-title">Artchive</h1>
    <ActivityHeatmap :data="artActivityData" />

    <div v-if="allPinnedArtworks.length > 0" class="section-header">
      <h2 class="section-title">
        <Icon
          icon="pin"
          style="color: var(--text)"
          width="30px"
          height="30px"
        />
        <span class="lotl-font" style="font-size: 1.2em">Pinned</span>
      </h2>
    </div>
    <ArtGrid :artworks="allPinnedArtworks" />
    <div class="section-header section-header-with-filter">
      <div class="section-title-group">
        <h2 class="section-title">
          <span class="lotl-font" style="font-size: 1.2em">All</span>
        </h2>
      </div>
      <button
        id="filter-button"
        popovertarget="filter-popover"
        :class="{
          active:
            filters.sketches ||
            filters.nsfw ||
            filters.characterArt ||
            filters.generalArt ||
            filters.gallery ||
            filters.variants ||
            filters.title ||
            tagInput.trim() !== '' ||
            filters.tags.length > 0 ||
            excludedMetadataFilters.length > 0,
        }"
      >
        <Icon
          :icon="
            filters.title && activeFilters.length === 1 ? 'search' : 'filter'
          "
        />
        {{ filtersToText || "Filters" }}
      </button>
      <div id="filter-popover" popover="auto" anchor="filter-button">
        <div class="filter-controls">
          <div class="filter-column">
            <fieldset>
              <legend>TYPE</legend>
              <label :class="{ selected: filters.generalArt }">
                <input
                  type="checkbox"
                  :checked="filters.generalArt"
                  @click.prevent="toggleArtworkTypeFilter('generalArt')"
                />
                General
                <Icon icon="art" />
              </label>
              <label :class="{ selected: filters.characterArt }">
                <input
                  type="checkbox"
                  :checked="filters.characterArt"
                  @click.prevent="toggleArtworkTypeFilter('characterArt')"
                />
                Character
                <Icon icon="character" />
              </label>
            </fieldset>
            <hr />
            <fieldset>
              <legend>METADATA</legend>
              <label
                :class="{
                  selected: filters.sketches,
                  'anti-filter': isMetadataFilterExcluded('sketches'),
                }"
              >
                <input
                  type="checkbox"
                  :checked="filters.sketches"
                  :indeterminate="isMetadataFilterExcluded('sketches')"
                  @click.prevent="cycleMetadataFilter('sketches')"
                />
                Sketches
                <Icon icon="sketch" />
              </label>
              <label
                :class="{
                  selected: filters.gallery,
                  'anti-filter': isMetadataFilterExcluded('gallery'),
                }"
              >
                <input
                  type="checkbox"
                  :checked="filters.gallery"
                  :indeterminate="isMetadataFilterExcluded('gallery')"
                  @click.prevent="cycleMetadataFilter('gallery')"
                />
                Has Gallery
                <Icon icon="images" />
              </label>
              <label
                :class="{
                  selected: filters.variants,
                  'anti-filter': isMetadataFilterExcluded('variants'),
                }"
              >
                <input
                  type="checkbox"
                  :checked="filters.variants"
                  :indeterminate="isMetadataFilterExcluded('variants')"
                  @click.prevent="cycleMetadataFilter('variants')"
                />
                Has Variants
                <Icon icon="layers" />
              </label>
            </fieldset>
          </div>
          <div class="filter-column">
            <fieldset>
              <legend>SEARCH</legend>
              <div class="search-section">
                <div class="search-wrapper">
                  <input
                    type="text"
                    v-model="filters.title"
                    placeholder="Search by name..."
                    autocomplete="off"
                  />
                  <Icon icon="search" style="margin-right: 0.5rem" />
                </div>
                <div class="search-wrapper">
                  <input
                    type="text"
                    v-model="tagInput"
                    placeholder="Search by tag..."
                    @focus="tagDropdownOpen = true"
                    @blur="onTagInputBlur"
                    autocomplete="off"
                  />
                  <Icon icon="tag" style="margin-right: 0.5rem" />
                </div>
                <div v-if="filters.tags.length > 0" class="tag-filter-chips">
                  <span
                    v-for="tag in filters.tags"
                    :key="tag"
                    class="tag-chip"
                    @click="removeTag(tag)"
                    >{{ tag }} &times;</span
                  >
                </div>
              </div>
            </fieldset>
            <hr />
            <fieldset>
              <legend>TOGGLES</legend>
              <label>
                <input
                  type="checkbox"
                  :checked="filters.nsfw"
                  @change="onNsfwToggle"
                />
                Show NSFW
                <Icon icon="r18" />
              </label>
            </fieldset>
            <hr />
            <fieldset>
              <legend>SORTING</legend>
              <label class="no-padding">
                <select v-model="filters.sortBy">
                  <option value="created">Created</option>
                  <option value="added">Added</option>
                  <option value="alphabetical">Alphabetical</option>
                  <option value="whatever">Whatever</option>
                </select>
              </label>
            </fieldset>
          </div>
        </div>
        <div v-if="tagDropdownOpen" class="tag-suggestions-scroll">
          <ul v-if="tagSuggestions.length > 0" class="tag-suggestions">
            <li
              v-for="tag in tagSuggestions"
              :key="tag"
              @mousedown.prevent="addTag(tag)"
            >
              {{ tag }}
            </li>
          </ul>
          <div
            v-else
            v-if="tagInput.trim() !== ''"
            style="color: var(--text-secondary); font-size: var(--small-text)"
          >
            No matching tags found.
          </div>
        </div>
      </div>
    </div>

    <ArtGrid :artworks="filteredArtworks" show-metadata show-character-badge />
    <SplashText />
    <AgeGateModal v-model="ageGateOpen" @confirm="filters.nsfw = true" />
  </div>
</template>

<script setup lang="ts">
import Icon from "~/components/common/Icon.vue";
import SplashText from "~/components/common/SplashText.vue";
import ArtGrid from "~/components/art/ArtGrid.vue";
import AgeGateModal from "~/components/art/AgeGateModal.vue";
import { useAgeVerification } from "../../composables/useAgeVerification";
import ActivityHeatmap from "~/components/home/ActivityHeatmap.vue";
type SortBy = "created" | "added" | "alphabetical" | "whatever";
const METADATA_FILTERS = ["sketches", "gallery", "variants"] as const;
type MetadataFilter = (typeof METADATA_FILTERS)[number];
type ArtworkTypeFilter = "generalArt" | "characterArt";
interface Filters {
  sortBy: SortBy;
  title: string;
  sketches: boolean;
  nsfw: boolean;
  characterArt: boolean;
  generalArt: boolean;
  gallery: boolean;
  variants: boolean;
  tags: string[];
}

const route = useRoute();
const router = useRouter();

// Boolean filters are encoded into the query parameters using a bitmask as follows:
// sketches, nsfw, characterArt, generalArt, gallery, variants
const FILTER_BITS: Array<keyof Omit<Filters, "title" | "tags">> = [
  "sketches",
  "nsfw",
  "characterArt",
  "generalArt",
  "gallery",
  "variants",
];

function parseQueryTags(raw: string | string[] | undefined): string[] {
  if (!raw) return [];
  const str = (Array.isArray(raw) ? raw[0] : raw) ?? "";
  return str
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

function parseExcludedMetadataFilters(
  raw: string | string[] | undefined,
): MetadataFilter[] {
  const decodedFilters = decodeBitmask(raw);
  return METADATA_FILTERS.filter((filter) => decodedFilters[filter]);
}

function decodeBitmask(raw: string | string[] | undefined): Partial<Filters> {
  const num = parseInt((Array.isArray(raw) ? raw[0] : raw) ?? "0", 10);
  if (isNaN(num) || num === 0) return {};
  return Object.fromEntries(
    FILTER_BITS.map((key, i) => [key, Boolean(num & (1 << i))]),
  );
}

function encodeBitmask(val: Filters): number {
  return FILTER_BITS.reduce((acc, key, i) => acc | (val[key] ? 1 << i : 0), 0);
}

function encodeExcludedMetadataFilters(filters: MetadataFilter[]): number {
  return filters.reduce(
    (bitmask, filter) => bitmask | (1 << FILTER_BITS.indexOf(filter)),
    0,
  );
}

const queryFilters = decodeBitmask(route.query.f as string | undefined);
const filters = ref<Filters>({
  title: typeof route.query.title === "string" ? route.query.title : "",
  sketches: false,
  nsfw: false,
  generalArt: false,
  gallery: false,
  variants: false,
  sortBy:
    typeof route.query.sort === "string" &&
    ["created", "added", "alphabetical", "whatever"].includes(route.query.sort)
      ? (route.query.sort as SortBy)
      : "created",
  tags: parseQueryTags(route.query.tags as string | undefined),
  ...queryFilters,
  characterArt: queryFilters.generalArt
    ? false
    : (queryFilters.characterArt ?? false),
});
const excludedMetadataFilters = ref<MetadataFilter[]>(
  parseExcludedMetadataFilters(route.query.not as string | undefined),
);

watch(
  [filters, excludedMetadataFilters],
  ([val, excluded]) => {
    const query: Record<string, string> = {};
    if (val.title) query.title = val.title;
    if (val.tags.length > 0) query.tags = val.tags.join(",");
    if (val.sortBy !== "created") query.sort = val.sortBy;
    const excludedBitmask = encodeExcludedMetadataFilters(excluded);
    if (excludedBitmask !== 0) query.not = String(excludedBitmask);
    const bitmask = encodeBitmask(val);
    if (bitmask !== 0) query.f = String(bitmask);
    router.replace({ query });
  },
  { deep: true },
);

const tagInput = ref("");
const tagDropdownOpen = ref(false);

const ageGateOpen = ref(false);
const { verified, init, isVerified } = useAgeVerification();

// An NSFW filter restored from the URL must not bypass the age check
const showNsfw = computed(() => filters.value.nsfw && verified.value);

onMounted(() => {
  init();
  if (filters.value.nsfw && !verified.value) filters.value.nsfw = false;
});

function onNsfwToggle(event: Event) {
  const input = event.target as HTMLInputElement;
  if (!input.checked || isVerified()) {
    filters.value.nsfw = input.checked;
    return;
  }
  input.checked = false;
  ageGateOpen.value = true;
}

function toggleArtworkTypeFilter(filter: ArtworkTypeFilter) {
  const otherFilter = filter === "generalArt" ? "characterArt" : "generalArt";
  filters.value[filter] = !filters.value[filter];
  filters.value[otherFilter] = false;
}

function isMetadataFilterExcluded(filter: MetadataFilter): boolean {
  return excludedMetadataFilters.value.includes(filter);
}

function cycleMetadataFilter(filter: MetadataFilter) {
  if (filters.value[filter]) {
    filters.value[filter] = false;
    excludedMetadataFilters.value.push(filter);
  } else if (isMetadataFilterExcluded(filter)) {
    excludedMetadataFilters.value = excludedMetadataFilters.value.filter(
      (excludedFilter) => excludedFilter !== filter,
    );
  } else {
    filters.value[filter] = true;
  }
}

const allKnownTags = computed(() => {
  const tagSet = new Set<string>();
  for (const artwork of allArtworks.value || []) {
    for (const tag of artwork.tags || []) {
      tagSet.add(tag);
    }
  }
  return [...tagSet].sort();
});

const tagSuggestions = computed(() => {
  const search = tagInput.value.trim().toLowerCase();
  return allKnownTags.value.filter(
    (tag) =>
      !filters.value.tags.includes(tag) &&
      (search === "" || tag.toLowerCase().includes(search)),
  );
});

function addTag(tag: string) {
  if (!filters.value.tags.includes(tag)) {
    filters.value.tags.push(tag);
  }
  tagInput.value = "";
}

function removeTag(tag: string) {
  filters.value.tags = filters.value.tags.filter((t) => t !== tag);
}

function onTagInputBlur() {
  tagDropdownOpen.value = false;
}

const FILTER_NAMES: Record<keyof Omit<Filters, "tags" | "sortBy">, string> = {
  title: "Title",
  sketches: "Sketches",
  nsfw: "NSFW",
  characterArt: "Character Art",
  generalArt: "General Art",
  gallery: "Galleries",
  variants: "Variants",
};

const activeFilters = computed(() =>
  (
    Object.keys(FILTER_NAMES) as Array<keyof Omit<Filters, "tags" | "sortBy">>
  ).filter((key) => Boolean(filters.value[key])),
);

const filtersToText = computed(() => {
  const tagCount = filters.value.tags.length;
  const filterCount =
    activeFilters.value.length + excludedMetadataFilters.value.length;

  const filterText =
    filterCount === 1
      ? activeFilters.value[0] === "title"
        ? `"${filters.value.title}"`
        : activeFilters.value.length === 1
          ? FILTER_NAMES[activeFilters.value[0]]
          : `No ${FILTER_NAMES[excludedMetadataFilters.value[0]]}`
      : filterCount > 1
        ? `${filterCount} Filters`
        : "";
  const tagText =
    tagCount === 1
      ? filters.value.tags[0]
      : tagCount > 1
        ? `${tagCount} Tags`
        : "";

  if (filterText && tagText) return `${filterText} & ${tagText}`;
  return filterText || tagText;
});

const { data: allArtworks } = await useAsyncData(
  "all-art",
  () => getArtworks(),
  {
    server: true,
  },
);

const allPinnedArtworks = computed(() =>
  (allArtworks.value || []).filter(
    (artwork) =>
      artwork.pinned &&
      isEcholotlArtwork(artwork) &&
      (showNsfw.value || !artwork.nsfw),
  ),
);

const artActivityData = computed(() => {
  const data: Record<string, { unit: string; count: number }[]> = {};
  (allArtworks.value || []).forEach((artwork) => {
    if (!isEcholotlArtwork(artwork)) return;
    // UTC, matching how the art detail page displays created_at; many dates are midnight UTC
    const date = new Date(artwork.created_at).toISOString().slice(0, 10);
    const activities = (data[date] ??= []);
    const art = activities.find((a) => a.unit === "artwork");
    if (art) art.count++;
    else activities.push({ unit: "artwork", count: 1 });
  });
  return data;
});

const filteredArtworks = computed(() => {
  const artworks = (allArtworks.value || []).filter((artwork) => {
    if (
      artwork.pinned ||
      !isEcholotlArtwork(artwork) ||
      (!showNsfw.value && artwork.nsfw)
    ) {
      return false;
    }

    const titleSearch = filters.value.title.trim().toLowerCase();
    if (titleSearch && !artwork.title.toLowerCase().includes(titleSearch)) {
      return false;
    }

    if (
      (filters.value.sketches && !artwork.sketch) ||
      (isMetadataFilterExcluded("sketches") && artwork.sketch)
    ) {
      return false;
    }

    if (
      filters.value.characterArt &&
      !artwork.character &&
      !artwork.related_characters?.length
    ) {
      return false;
    }

    if (
      filters.value.generalArt &&
      (artwork.character || artwork.related_characters?.length)
    ) {
      return false;
    }

    const hasGallery = artwork.images.length > 1;
    if (
      (filters.value.gallery && !hasGallery) ||
      (isMetadataFilterExcluded("gallery") && hasGallery)
    ) {
      return false;
    }

    const hasVariants = artwork.images.some(
      (image) => image.variants && image.variants.length > 0,
    );
    if (
      (filters.value.variants && !hasVariants) ||
      (isMetadataFilterExcluded("variants") && hasVariants)
    ) {
      return false;
    }

    if (
      filters.value.tags.length > 0 &&
      !filters.value.tags.every((tag) => artwork.tags?.includes(tag))
    ) {
      return false;
    }

    return true;
  });

  return artworks.sort((firstArtwork, secondArtwork) => {
    switch (filters.value.sortBy) {
      case "created":
        return (
          new Date(secondArtwork.created_at).getTime() -
          new Date(firstArtwork.created_at).getTime()
        );
      case "added":
        return (
          new Date(secondArtwork.modified_at).getTime() -
          new Date(firstArtwork.modified_at).getTime()
        );
      case "alphabetical":
        return firstArtwork.title.localeCompare(secondArtwork.title);
      case "whatever":
        return Math.random() - 0.5;
    }
  });
});

useSeoMeta({
  title: "Art Archive",
  description: "Explore all of the art created by echolotl!",
  ogTitle: "echolotl's Art Archive",
  ogDescription: "Explore all of the art created by echolotl!",
});
</script>

<style scoped lang="scss">
@use "~/assets/styles/partials/mixins" as *;
.art-page {
  margin: 0 auto;
  padding: 2rem;
  margin-top: 2rem;
  max-width: 1200px;
  text-align: center;
  @media (max-width: 600px) {
    padding: 1rem;
  }
}

.art-title {
  mask-image: url("/images/art/title.webp");
  mask-size: contain;
  mask-repeat: no-repeat;
  mask-position: center;
  width: 100%;
  height: 100px;
  image-rendering: crisp-edges;
  background-color: var(--text);
}

#filter-button {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  background: none;
  border: none;
  border-radius: 1000px;
  padding: 0.25rem 0.5rem;
  cursor: pointer;
  font-size: var(--base-text);
  color: var(--text-secondary);
  text-transform: uppercase;
  &:hover {
    background-color: var(--foreground);
  }
  &.active {
    background-color: var(--primary);
    color: var(--background);
    font-weight: bold;
  }
}

#filter-popover:popover-open {
  position: absolute;
  display: flex;
  position-area: bottom span-x-start;
  margin: 0.25rem 0;
  border: none;
  padding: 0;
  background: none;
  flex-direction: column;
  > div {
    border: 1px solid var(--distant);
    background: var(--surface);
    padding: 0.5rem;
    width: 430px;
    inset: auto;
    border-top: 2px solid var(--primary);
    box-shadow: 0 0 4px rgba(0, 0, 0, 0.5);
  }

  .filter-controls {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1rem;
  }

  .filter-column {
    flex-direction: column;
    gap: 0.5rem;
  }

  fieldset {
    border: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
    align-items: flex-start;

    legend {
      margin-bottom: 0.25rem;
      font-size: var(--small-text);
      font-weight: bold;
      text-transform: uppercase;
      color: var(--text-secondary);
      text-align: left;
    }
    label {
      display: flex;
      width: calc(100% - 1rem);
      border-radius: 4px;

      align-items: center;
      justify-content: space-between;
      color: var(--text);
      input[type="checkbox"] {
        display: none;
      }

      &:has(input[type="checkbox"]) {
        cursor: pointer;
      }

      &:hover {
        transition: background-color 0s;
        background-color: var(--foreground);
      }

      &:has(input[type="checkbox"]:checked) {
        background-color: var(--primary);
        color: var(--background);
      }

      &.selected {
        background-color: var(--primary);
        color: var(--background);
      }

      &.anti-filter {
        background-color: var(--foreground);
        color: var(--text-secondary);
        text-decoration: line-through;
      }

      &:not(.no-padding) {
        padding: 0.25rem 0.5rem;
      }

      &.no-padding {
        width: 100%;
      }

      select {
        box-sizing: border-box;
        background: var(--background);
        border: 1px solid var(--distant);
        border-radius: 4px;
        padding: 0.15rem 0.25rem;
        font-size: var(--small-text);
        color: var(--text);
        width: 100%;
        font-family: inherit;
        outline: none;
      }
    }

    .search-section {
      hr {
        margin: 0.25rem 0;
      }
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .search-wrapper {
      position: relative;
      width: 100%;
      color: var(--text);
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: 0.5rem;

      input[type="text"] {
        width: 100%;
        box-sizing: border-box;
        background: var(--background);
        border: 1px solid var(--distant);
        border-radius: 4px;
        padding: 0.25rem 0.5rem;
        font-size: var(--small-text);
        font-family: inherit;
        color: var(--text);
        outline: none;

        &:focus {
          border-color: var(--primary);
        }

        &::placeholder {
          color: var(--text-secondary);
        }
      }
    }

    .tag-filter-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 0.25rem;
    }

    .tag-chip {
      display: inline-flex;
      align-items: center;
      gap: 0.2rem;
      background: var(--primary);
      color: var(--background);
      border-radius: 4px;
      padding: 0.1rem 0.4rem;
      font-size: var(--small-text);
      cursor: pointer;

      &:hover {
        opacity: 0.8;
      }
    }
  }

  @media (max-width: 600px) {
    > div {
      width: 200px;
    }

    .filter-controls {
      grid-template-columns: 1fr;
      gap: 0.5rem;
    }
  }
}

.tag-suggestions-scroll {
  max-height: 100px;
  overflow-y: auto;
  scroll-snap-type: y mandatory;
  scroll-padding: 0.3rem;
}

.tag-suggestions {
  margin: 0;
  padding: 0;
  list-style: none;

  li {
    padding: 0.25rem 0.5rem;
    font-size: var(--small-text);
    color: var(--text);
    cursor: pointer;
    text-align: left;
    border-radius: 4px;
    scroll-snap-align: start;
    scroll-snap-stop: always;

    &:hover {
      background: var(--foreground);
    }
  }
}

.loading {
  text-align: center;
  padding: 2rem;
  font-size: var(--base-text);
  color: var(--text-secondary);
}

.end-message {
  text-align: center;
  padding: 2rem;
  font-size: var(--base-text);
  color: var(--text-secondary);
  font-style: italic;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 1rem 0;
  h2 {
    margin: 0;
  }
}

.section-header-with-filter {
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  margin: 0.5rem 0;
}

.section-title-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.section-title {
  @include color-text-stroke(var(--text), 6px);
  color: var(--background);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}
</style>
