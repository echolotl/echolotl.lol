<template>
  <div class="art-page">
    <h1 class="art-title">Artchive</h1>
    <ActivityHeatmap :data="artActivityData" />

    <div v-if="allPinnedArtworks.length > 0" class="section-header">
      <h2 class="section-title">
        <Icon icon="pin" style="color: var(--text)" size="30px" />
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
                  <label class="sr-only" for="art-title-search">
                    Search artwork by name
                  </label>
                  <input
                    id="art-title-search"
                    type="text"
                    v-model="filters.title"
                    placeholder="Search by name..."
                    autocomplete="off"
                  />
                  <Icon icon="search" style="margin-right: 0.5rem" />
                </div>
                <div class="tag-combobox">
                  <div class="search-wrapper">
                    <label class="sr-only" for="art-tag-search">
                      Search artwork by tag
                    </label>
                    <input
                      id="art-tag-search"
                      type="text"
                      role="combobox"
                      aria-autocomplete="list"
                      aria-controls="art-tag-suggestions"
                      :aria-expanded="tagDropdownOpen"
                      :aria-activedescendant="
                        activeTagIndex >= 0
                          ? `art-tag-option-${activeTagIndex}`
                          : undefined
                      "
                      v-model="tagInput"
                      placeholder="Add tag..."
                      @focus="tagDropdownOpen = true"
                      @input="onTagInput"
                      @blur="onTagInputBlur"
                      @keydown="onTagKeydown"
                      autocomplete="off"
                    />
                    <Icon icon="tag" style="margin-right: 0.5rem" />
                  </div>
                  <ul
                    v-if="tagDropdownOpen && tagSuggestions.length > 0"
                    id="art-tag-suggestions"
                    class="tag-suggestions"
                    role="listbox"
                    aria-label="Tag suggestions"
                  >
                    <li
                      v-for="(tag, index) in tagSuggestions"
                      :id="`art-tag-option-${index}`"
                      :key="tag"
                      role="option"
                      :aria-selected="index === activeTagIndex"
                      :class="{ active: index === activeTagIndex }"
                      @mousedown.prevent
                      @click="addTag(tag)"
                      @mousemove="activeTagIndex = index"
                    >
                      {{ tag }}
                    </li>
                  </ul>
                  <div
                    v-else-if="tagDropdownOpen && tagInput.trim() !== ''"
                    class="tag-suggestions empty"
                  >
                    No matching tags found.
                  </div>
                </div>
                <div v-if="filters.tags.length > 0" class="tag-filter-chips">
                  <Tag
                    v-for="tag in filters.tags"
                    :key="tag"
                    clickable
                    :aria-label="`Remove tag ${tag}`"
                    @click="removeTag(tag)"
                  >
                    {{ tag }}
                    <Icon icon="close" size="1em" style="margin-left: 0.1rem" />
                  </Tag>
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
              <label class="no-padding" for="art-sort">
                <span class="sr-only"> Sort artworks </span>
                <select id="art-sort" v-model="filters.sortBy">
                  <option value="created">Created</option>
                  <option value="added">Modified</option>
                  <option value="alphabetical">Alphabetical</option>
                  <option value="whatever">Whatever</option>
                </select>
              </label>
            </fieldset>
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
import Icon from "~/components/ui/Icon.vue";
import Tag from "~/components/ui/Tag.vue";
import SplashText from "~/components/ui/SplashText.vue";
import ArtGrid from "~/components/art/ArtGrid.vue";
import AgeGateModal from "~/components/art/AgeGateModal.vue";
import { useAgeVerification } from "../../composables/useAgeVerification";
import ActivityHeatmap from "~/components/ui/ActivityHeatmap.vue";
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

const activeTagIndex = ref(-1);

function addTag(tag: string) {
  if (!filters.value.tags.includes(tag)) {
    filters.value.tags.push(tag);
  }
  tagInput.value = "";
  activeTagIndex.value = -1;
}

function removeTag(tag: string) {
  filters.value.tags = filters.value.tags.filter((t) => t !== tag);
}

function onTagInput() {
  tagDropdownOpen.value = true;
  activeTagIndex.value = tagSuggestions.value.length > 0 ? 0 : -1;
}

function onTagInputBlur() {
  tagDropdownOpen.value = false;
  activeTagIndex.value = -1;
}

function onTagKeydown(event: KeyboardEvent) {
  const count = tagSuggestions.value.length;
  switch (event.key) {
    case "ArrowDown":
      event.preventDefault();
      tagDropdownOpen.value = true;
      if (count > 0) activeTagIndex.value = (activeTagIndex.value + 1) % count;
      break;
    case "ArrowUp":
      event.preventDefault();
      tagDropdownOpen.value = true;
      if (count > 0)
        activeTagIndex.value = (activeTagIndex.value - 1 + count) % count;
      break;
    case "Enter": {
      event.preventDefault();
      const tag = tagSuggestions.value[activeTagIndex.value];
      if (tag) addTag(tag);
      break;
    }
    case "Backspace":
      if (tagInput.value === "" && filters.value.tags.length > 0) {
        removeTag(filters.value.tags[filters.value.tags.length - 1]!);
      }
      break;
    case "Escape":
      if (tagDropdownOpen.value) {
        event.stopPropagation();
        tagDropdownOpen.value = false;
      }
      break;
  }
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
  const activitiesByDate: Record<string, { unit: string; count: number }[]> =
    {};
  (allArtworks.value || []).forEach((artwork) => {
    if (!isEcholotlArtwork(artwork)) return;
    // UTC, matching how the art detail page displays created_at; many dates are midnight UTC
    const date = new Date(artwork.created_at).toISOString().slice(0, 10);
    const activities = (activitiesByDate[date] ??= []);
    const art = activities.find((a) => a.unit === "artwork");
    if (art) art.count++;
    else activities.push({ unit: "artwork", count: 1 });
  });
  return {
    activitiesByDate,
    colorsByUnit: { artwork: "var(--primary)" },
  };
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
@use "~/assets/styles/util" as *;
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
  overflow: visible;
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

    .tag-combobox {
      position: relative;
    }

    .tag-filter-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 0.25rem;
      margin-top: 0.25rem;
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

.tag-suggestions {
  position: absolute;
  top: calc(100% + 2px);
  left: 0;
  right: 0;
  z-index: 10;
  box-sizing: border-box;
  margin: 0;
  padding: 0.25rem;
  list-style: none;
  max-height: 10rem;
  overflow-y: auto;
  background: var(--surface);
  border: 1px solid var(--distant);
  border-radius: 4px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
  font-size: var(--small-text);

  li {
    padding: 0.25rem 0.5rem;
    color: var(--text);
    cursor: pointer;
    text-align: left;
    border-radius: 4px;

    &.active {
      background: var(--primary);
      color: var(--background);
    }
  }

  &.empty {
    color: var(--text-secondary);
    text-align: left;
    padding: 0.5rem;
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
