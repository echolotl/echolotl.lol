<template>
  <PicrossPage subtitle="Editor (WIP!!)" accent="var(--orange)">
    <PicrossGrid
      v-if="game"
      ref="grid"
      :game="game"
      :editable="true"
      :paint-index="selectedIndex"
      :style="{ '--paint-color': selectedColor ?? 'var(--text)' }"
    />
    <div class="game-actions">
      <PicrossInputControls
        :grid="grid"
        :remove-modes="['mark']"
        :add-modes="['paint']"
      />
      <button @click="handleClear" class="round">
        <Icon icon="trash" width="20px" height="20px" />
        Clear
      </button>
      <PicrossSizeInput
        :model-value="sizeInput"
        @update:model-value="applySizeInput"
      />
    </div>
    <template v-if="grid?.inputMode === 'paint'">
      <div class="palette">
        <div class="new-color-container">
          <div class="palette-header">
            <Icon icon="palette" width="24px" height="24px" />
            <button
              type="button"
              aria-label="Load colors from image"
              @click="loadColorsFromImage"
            >
              <Icon icon="upload" width="24px" height="24px" />
            </button>
          </div>

          <div class="new-color">
            <Tooltip>
              <button
                type="button"
                class="add-color-swatch"
                :style="{ '--paint-color': newColor }"
                aria-label="Choose new color"
              ></button>
              <template #text>
                <div class="tooltip">
                  <ColorPicker v-model="newColor" />
                </div>
              </template>
            </Tooltip>
            <button
              class="add-button"
              @click="addColor()"
              aria-label="Add color to palette"
            >
              <Icon icon="small-arrow" width="20px" height="20px" />
            </button>
          </div>
        </div>
        <div class="swatches">
          <button
            type="button"
            class="color-swatch default-swatch"
            :class="{ selected: selectedIndex === null }"
            title="Default color"
            aria-label="Default color"
            :aria-pressed="selectedIndex === null"
            @click="selectedIndex = null"
          ></button>
          <Tooltip v-for="(color, index) in palette" :key="index">
            <button
              type="button"
              class="color-swatch"
              :class="{ selected: selectedIndex === index }"
              :style="{ '--paint-color': color }"
              :aria-label="`Select palette color ${index + 1}`"
              :aria-pressed="selectedIndex === index"
              @click="selectedIndex = index"
            ></button>
            <template #text
              ><div class="swatch-tooltip">
                <div class="tooltip-header">
                  <span class="lotl-font">#{{ formatWithZeros(index, 2) }}</span
                  ><button
                    type="button"
                    :aria-label="`Delete palette color ${index + 1}`"
                    @click="deleteColor(index)"
                  >
                    <Icon icon="trash" width="20px" height="20px" />
                  </button>
                </div>
                <ColorPicker v-model="palette[index]" />
              </div>
            </template>
          </Tooltip>
        </div>
      </div>
    </template>

    <div class="solve-result">
      <div class="solve-result-header text-secondary lotl-font">
        SOLVABILITY
      </div>
      <div v-if="solving" style="color: var(--text-secondary)">Checking...</div>
      <div
        v-else-if="
          solveResult?.logicSolvable && solveResult?.solutionCount === 1
        "
        style="color: var(--green)"
      >
        <Icon icon="check" width="20px" height="20px" />
        Solvable
      </div>
      <div
        v-else-if="solveResult && solveResult.solutionCount > 1"
        style="color: var(--orange)"
      >
        <Icon icon="warning" width="20px" height="20px" />
        Multiple solutions
      </div>
      <div v-else style="color: var(--red)">
        <Icon icon="danger" width="20px" height="20px" />
        Unsolvable...
      </div>
    </div>
    <div class="settings">
      <fieldset>
        <legend>Metadata (optional)</legend>
        <label>
          Title
          <input
            v-model="metadata.title"
            placeholder="Untitled"
            type="text"
            maxlength="100"
          />
        </label>
        <div class="row">
          <label>
            Author
            <input
              v-model="metadata.author.name"
              placeholder="echolotl"
              type="text"
              maxlength="100"
            />
          </label>
          <label>
            Source
            <input
              v-model="metadata.source.name"
              placeholder="Some picross game"
              type="text"
              maxlength="100"
            />
          </label>
        </div>
        <div class="file-actions">
          <button @click="handleSave" class="round">
            <Icon icon="download" width="20px" height="20px" />
            Save
          </button>
          <button @click="fileInput?.click()" class="round">
            <Icon icon="upload" width="20px" height="20px" />
            Load
          </button>
          <input
            ref="fileInput"
            type="file"
            :accept="`.${FILE_EXTENSION}`"
            hidden
            @change="handleLoad"
          />
        </div>
      </fieldset>
      <p v-if="fileError" class="file-error" role="alert">{{ fileError }}</p>
    </div>
  </PicrossPage>
</template>

<script setup lang="ts">
import PicrossGrid from "~/components/picross/PicrossGrid.vue";
import Icon from "~/components/ui/Icon.vue";
import PicrossPage from "~/components/picross/PicrossPage.vue";
import PicrossInputControls from "~/components/picross/PicrossInputControls.vue";
import PicrossSizeInput from "~/components/picross/PicrossSizeInput.vue";
import ColorPicker from "~/components/ui/ColorPicker.vue";
import {
  createPicrossGame,
  clearBoard,
  clampPicrossSize,
  getHints,
  getPaletteColor,
  type PicrossGame,
  type PicrossSize,
} from "~/utils/picross";
import { loadPicrossPuzzle, savePicrossPuzzle } from "~/utils/picross/file";
import Tooltip from "~/components/ui/Tooltip.vue";

const sizeInput = reactive<PicrossSize>({
  width: DEFAULT_BOARD_SIZE,
  height: DEFAULT_BOARD_SIZE,
});
const metadata = reactive({
  title: "",
  author: { name: "" },
  source: { name: "" },
});

let createdAt: string | null = null;
const game = ref<PicrossGame | null>(null);
const grid = ref<InstanceType<typeof PicrossGrid> | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);
const fileError = ref("");
const selectedIndex = ref<number | null>(null);
const newColor = ref("#000000");
const palette = computed(() => game.value?.palette.colors ?? []);
const selectedColor = computed(() =>
  game.value ? getPaletteColor(game.value.palette, selectedIndex.value) : null,
);

definePageMeta({
  pageTransition: false,
  viewTransition: true,
});

function addColor() {
  const current = game.value;
  if (!current) return;
  const color = newColor.value.toLowerCase();
  let index = current.palette.colors.indexOf(color);
  if (index === -1) index = current.palette.colors.push(color) - 1;
  selectedIndex.value = index;
}

function deleteColor(index: number) {
  const palette = game.value?.palette;
  if (!palette?.colors[index]) return;
  const shift = (i: number | null) =>
    i === null || i === index ? null : i > index ? i - 1 : i;
  palette.colors.splice(index, 1);
  palette.indices.forEach((row) =>
    row.forEach((tileIndex, x) => (row[x] = shift(tileIndex))),
  );
  grid.value?.clearHistory();
  if (selectedIndex.value === index) {
    // Fall to the neighboring swatch, or the default color if none are left
    const next = Math.min(index, palette.colors.length - 1);
    selectedIndex.value = next < 0 ? null : next;
  } else {
    selectedIndex.value = shift(selectedIndex.value);
  }
}

const { result: solveResult, solving, solve } = usePicrossSolver();

// Builds a game of the given size, keeping any tiles that still fit
function buildGame(
  size: PicrossSize,
  previous?: Pick<PicrossGame, "solution" | "palette"> | null,
) {
  const solution = Array.from({ length: size.height }, (_, y) =>
    Array.from(
      { length: size.width },
      (_, x) => previous?.solution[y]?.[x] ?? false,
    ),
  );
  const next = createPicrossGame(size, solution);
  next.palette.colors = [...(previous?.palette.colors ?? [])];
  next.board.forEach((row, y) =>
    row.forEach((_, x) => {
      if (solution[y]?.[x]) row[x] = "filled";
      next.palette.indices[y]![x] = previous?.palette.indices[y]?.[x] ?? null;
    }),
  );
  return next;
}

function init() {
  game.value = buildGame(clampPicrossSize(sizeInput));
}

function applySizeInput(size: PicrossSize) {
  sizeInput.width = size.width;
  sizeInput.height = size.height;
  game.value = buildGame(size, game.value);
}

function handleClear() {
  if (!game.value) return;
  clearBoard(game.value);
  game.value.solution.forEach((row) => row.fill(false));
  game.value.hints = getHints(game.value.solution);
  grid.value?.clearHistory();
}

onMounted(init);

function handleSave() {
  if (!game.value) return;
  fileError.value = "";
  const created_at = createdAt || new Date().toISOString();
  let contents: Uint8Array;
  try {
    contents = savePicrossPuzzle({
      metadata: {
        title: metadata.title,
        author: metadata.author,
        source: metadata.source,
        created_at,
        modified_at: new Date().toISOString(),
      },
      size: game.value.size,
      solution: game.value.solution,
      palette: game.value.palette,
    });
  } catch (error) {
    fileError.value = error instanceof Error ? error.message : "Couldn't save";
    return;
  }
  createdAt = created_at;

  const filename =
    (metadata.title || "puzzle")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "puzzle";
  const url = URL.createObjectURL(
    new Blob([contents as BlobPart], { type: "application/octet-stream" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.${FILE_EXTENSION}`;
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function handleLoad(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  // Clearing the value lets the same file be picked again
  input.value = "";
  if (!file) return;
  fileError.value = "";
  try {
    const puzzle = loadPicrossPuzzle(new Uint8Array(await file.arrayBuffer()));
    game.value = buildGame(puzzle.size, puzzle);
    selectedIndex.value = null;
    sizeInput.width = puzzle.size.width;
    sizeInput.height = puzzle.size.height;
    const { title, author, source, created_at } = puzzle.metadata;
    metadata.title = title ?? "";
    metadata.author = author ?? { name: "" };
    metadata.source = source ?? { name: "" };
    createdAt = created_at;
  } catch (error) {
    fileError.value =
      error instanceof Error ? error.message : "Couldn't load that file";
  }
}

async function loadColorsFromImage() {
  if (!game.value) return;
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.click();
  const file = await new Promise<File | null>((resolve) => {
    input.onchange = (event) => {
      resolve((event.target as HTMLInputElement).files?.[0] ?? null);
    };
  });

  if (!file) return;
  try {
    const WIDTH = game.value.size.width;
    const HEIGHT = game.value.size.height;
    const imageBitmap = await createImageBitmap(file);
    // Draw the image onto a canvas the size of the puzzle
    const processingCanvas = new OffscreenCanvas(WIDTH, HEIGHT);
    const ctx = processingCanvas.getContext("2d");
    if (!ctx) throw new Error("Failed to get canvas context");
    ctx.drawImage(imageBitmap, 0, 0, WIDTH, HEIGHT);

    // Process the canvas to extract colors and update the palette
    const imageData = ctx.getImageData(0, 0, WIDTH, HEIGHT);
    const colors = new Set<string>();
    const indices: (number | null)[][] = [];
    for (let y = 0; y < HEIGHT; y++) {
      const row: (number | null)[] = [];
      for (let x = 0; x < WIDTH; x++) {
        const i = (y * WIDTH + x) * 4;
        const r = imageData.data[i];
        const g = imageData.data[i + 1];
        const b = imageData.data[i + 2];
        if (r === undefined || g === undefined || b === undefined) {
          row.push(null);
          continue;
        }
        const color = rgbToHex({ r, g, b });
        colors.add(color);
        row.push([...colors].indexOf(color));
      }
      indices.push(row);
    }
    game.value.palette = {
      indices: indices,
      colors: Array.from(colors),
    };
  } catch (error) {
    fileError.value =
      error instanceof Error ? error.message : "Couldn't load image";
  }
}

// Solvability is only checked once a stroke finishes, not on every tile painted
let solvePending = false;

function solveIfIdle() {
  if (!solvePending || grid.value?.stroke) return;
  const current = game.value;
  if (!current) return;
  solvePending = false;
  solve(current.hints, current.size);
}

watch(
  () => game.value?.hints,
  (hints) => {
    if (!hints) return;
    solvePending = true;
    solveIfIdle();
  },
);

watch(() => grid.value?.stroke, solveIfIdle);

useSeoMeta({
  title: "echolotl - Nautilus' Picross (Editor)",
  description: "Make your own picross puzzle for Nautilus to eat!",
  ogDescription: "Make your own picross puzzle for Nautilus to eat!",
  ogTitle: "Nautilus' Picross (Editor)",
  ogUrl: "https://echolotl.lol/picross/editor",
});
</script>

<style scoped>
.file-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 0.5rem 0.5rem 0;

  > button {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 8px;
  }
}

.file-error {
  color: var(--red);
}

.solve-result {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;

  gap: 4px;
  > div {
    display: flex;
    align-items: center;
    gap: 6px;
  }
}

.settings {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  align-items: start;
  justify-content: start;
  width: 100%;
  gap: 1rem;

  fieldset {
    border: none;
    padding: 0;
    > legend {
      margin: 1rem 0 0.5rem;
      font-size: var(--small-text);
      text-transform: uppercase;
      color: var(--text-secondary);
      font-family: "Lotl";
    }
    label {
      display: flex;
      flex-direction: column;
      padding: 0.25rem 0.5rem;
      font-size: var(--small-text);
      text-transform: uppercase;
      color: var(--text-secondary);

      input {
        margin-top: 4px;
        &[type="number"] {
          background: var(--surface);
          color: var(--text);
          border: none;
          padding: 4px;
          font-family: inherit;
          text-align: center;
          font-weight: bold;
          border-radius: 6px;
          &::-webkit-inner-spin-button,
          &::-webkit-outer-spin-button {
            -webkit-appearance: none;
            margin: 0;
          }
        }
        &[type="text"] {
          background: none;
          color: var(--text);
          border: none;
          font-family: inherit;
          box-shadow: inset 0 -2px 0 var(--surface);
          outline: none;
          padding: 6px 4px;
        }
      }
    }
    > .row {
      display: flex;
      flex-direction: row;
      align-items: center;

      > label {
        flex: 1;
        min-width: 0;
      }
    }
  }
}

.palette {
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: flex-start;
  color: var(--text-secondary);

  .new-color-container {
    display: flex;
    width: 100%;
    align-items: center;
    justify-content: space-between;
    gap: 6px;

    .palette-header {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .add-button {
      transform: rotate(90deg);
    }
  }

  button {
    padding: 0;
    background: none;
    border: none;
  }
  input[type="color"] {
    appearance: none;
    -moz-appearance: none;
    -webkit-appearance: none;
    width: 48px;
    padding: 0;
    border: 0;
    background: none;

    &::-webkit-color-swatch-wrapper {
      padding: 0;
    }

    &::-webkit-color-swatch {
      border: 1px solid var(--distant);
      border-radius: 0;
    }

    &::-moz-color-swatch,
    & ::-moz-focus-inner {
      border: 1px solid var(--distant);
    }

    &::-moz-focus-inner {
      padding: 0;
    }
  }
  .new-color {
    display: flex;
    align-items: center;
    gap: 6px;

    .add-color-swatch {
      width: 48px;
      height: 24px;
      background-color: var(--paint-color);
      box-shadow: 0 0 0 2px
        color-mix(in srgb, var(--paint-color) 33%, var(--inverted-solid));
      border-radius: 16px;
      cursor: pointer;
      transition: none;
    }
  }
  .swatches {
    border: 1px solid var(--foreground);
    display: grid;
    grid-template-columns: repeat(7, 24px);
    gap: 1px;
    background: var(--surface);

    .swatch-tooltip {
      display: flex;
      justify-content: center;
      align-items: center;
      flex-direction: column;
      gap: 4px;

      .tooltip-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
        padding-top: 0.25rem;
      }
    }

    .color-swatch {
      width: 24px;
      height: 24px;
      background-color: var(--paint-color);
      cursor: pointer;
      display: block;

      &.selected {
        outline: 2px solid
          color-mix(in srgb, var(--paint-color) 33%, var(--inverted-solid));
        z-index: 1;
      }

      &.default-swatch {
        padding: 0;
        border: none;
        background: repeating-conic-gradient(
            var(--foreground) 0% 25%,
            var(--solid) 0% 50%
          )
          50% / 24px 24px;

        &.selected {
          outline: 2px solid var(--inverted-solid);
          z-index: 1;
        }
      }
    }
  }
}
</style>
