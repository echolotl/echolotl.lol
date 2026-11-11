<template>
  <Modal v-model="open" icon="help" icon-color="var(--blue)">
    <div class="how-to-play-modal">
      <div
        class="nautilus"
        ref="nautilusEl"
        aria-hidden="true"
        @click="playChipSound()"
      />
      <h2 class="title lotl-font">
        How to Picross
        <span class="text-secondary">with Nautilus</span>
      </h2>
      <p class="text">
        <b>Picross</b> <span class="text-secondary">(or Nonograms)</span> is a
        puzzle game where you fill in pixels on a grid based on the number hints
        provided by each <b>row</b> and <b>column</b>. Most puzzles can be
        solved logically without guessing.
      </p>
      <p class="text">
        <b>Hints</b> indicate the individual <b>runs of pixels</b> that need to
        be filled in for each row and column. Runs must be separated by
        <b>at least one empty pixel</b>, but that does not mean there can only
        be one empty pixel between runs.
      </p>
      <div class="example">
        <span class="example-hints lotl-font">
          <span v-for="(hint, i) in exampleHints" :key="i">{{ hint }}</span>
        </span>
        <div class="example-board" aria-hidden="true">
          <span
            v-for="(state, i) in exampleRow"
            :key="i"
            class="example-tile"
            :class="state"
          />
        </div>
      </div>
      <p class="text text-secondary">
        The hint <b>2 1</b> means this row has a run of two filled pixels,
        followed by a run of one, with at least one empty pixel between them.
      </p>
      <h3 class="subtitle lotl-font">Tips & Tricks</h3>
      <ul class="list">
        <li>
          Try to start with rows or columns that have the largest numbers!
        </li>
        <li>
          Remember to mark (<Icon icon="close" size="18px" />)
          what you think are empty pixels.
        </li>
        <li>
          See if pixels HAVE to be filled based on every possible configuration
          of the row or column.
        </li>
        <li class="text-secondary">hi mimi</li>
      </ul>
    </div>
  </Modal>
</template>

<script lang="ts" setup>
import Modal from "~/components/ui/Modal.vue";
import Icon from "~/components/ui/Icon.vue";
import { createSoundPlayer, type SoundPlayer } from "~/utils/audio";

const open = defineModel<boolean>({ required: true });
const nautilusEl = ref<HTMLElement | null>(null);
let soundPlayer: SoundPlayer;
let chipSounds: AudioBuffer[] = [];

const exampleHints = [2, 1];
const exampleRow = ["filled", "filled", "empty", "empty", "filled"];

onMounted(() => {
  soundPlayer = createSoundPlayer();
  Promise.all(
    [1, 2, 3].map((i) =>
      soundPlayer.load(`/sounds/picross/nautilus/chip${i}.wav`),
    ),
  ).then((buffers) => {
    chipSounds = buffers.filter((b): b is AudioBuffer => b !== null);
  });
});

function playChipSound() {
  if (chipSounds.length > 0) {
    const index = Math.floor(Math.random() * chipSounds.length);
    soundPlayer.play(chipSounds[index]);
    if (!nautilusEl.value) return;
    nautilusEl.value.classList.add("speaking");
    setTimeout(() => {
      nautilusEl.value?.classList.remove("speaking");
    }, 100);
  }
}
</script>

<style scoped lang="scss">
.how-to-play-modal {
  display: flex;
  flex-direction: column;
  gap: 12px;

  .nautilus {
    position: absolute;
    display: block;
    background-image: url("/images/picross/nautilus_how_to_play.webp");
    background-size: contain;
    background-repeat: no-repeat;
    left: -264px;
    top: -6px;
    pointer-events: auto;
    transform-origin: right center;
    &.speaking {
      animation: speaking 0.1s;
    }

    width: 300px;
    height: 400px;

    @media (max-width: 768px) {
      display: none;
    }
  }

  & .title {
    margin: 0;
  }
  & .subtitle {
    margin: 0;
  }

  & .text {
    margin: 0;
  }

  & .example {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 16px;
  }

  & .example-hints {
    display: flex;
    gap: 8px;
    font-size: 14px;
    line-height: 30px;
  }

  & .example-board {
    --tile: 30px;
    display: grid;
    grid-template-columns: repeat(5, var(--tile));
    grid-auto-rows: var(--tile);
    background-color: var(--surface);
    overflow: hidden;
    box-shadow: 0 0 0 1px var(--foreground);
  }

  & .example-tile {
    position: relative;
    box-sizing: border-box;
    border-left: 1px solid var(--distant);
    background-color: color-mix(in srgb, var(--inverted-solid) 5%, transparent);

    &:first-child {
      border-left: none;
    }

    &.filled::before {
      content: "";
      position: absolute;
      inset: 0;
      background: var(--text);
    }

    &.marked::before {
      content: "";
      position: absolute;
      inset: 0;
      background: var(--text);
      mask-image: url("/images/icons/close.webp");
      mask-size: 100%;
    }
  }

  & .text :deep(.icon),
  li :deep(.icon) {
    vertical-align: -0.125em;
  }

  & .close {
    background: none;
    border: none;
    border-radius: 9999px;
    aspect-ratio: 1 / 1;
    padding: 4px;
    cursor: pointer;
    &:hover {
      background: rgba(0, 0, 0, 0.1);
    }
  }

  & .remember {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    user-select: none;
  }

  & .actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 4px;
  }
  & .list {
    padding-left: 20px;
    margin: 0;
  }
}
@keyframes speaking {
  0% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-5px);
  }
  100% {
    transform: translateY(0);
  }
}
</style>
