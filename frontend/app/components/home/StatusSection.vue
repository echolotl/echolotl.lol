<template>
  <template v-if="status">
    <div class="status-think-bubble" :style="{ filter: filterUrl }">
      <div
        v-if="status === 'loading'"
        style="display: flex; align-items: center; gap: 0.25rem">
        <Icon icon="loading" size="32px" />
        Thinking of a status...
      </div>
      <div v-else-if="status === 'error'" style="color: var(--red)">
        Error loading status.
      </div>
      <template v-else-if="isEcholotlStatus(status)">
        <span class="emoji">{{ status.emoji }}</span>
        <span>{{ status.text }}</span>
        <span class="extra-info">
          {{ getCreatedAtRelativeTime(status.createdAt) }}</span
        >
      </template>
      <template v-else>
        <span class="emoji"
          ><Icon
            icon="music-note"
            size="54px"
            style="color: var(--primary)"
        /></span>
        <span>
          Listening to
          <a :href="status.href" target="_blank" class="link">
            <b>{{ status.title }}</b></a
          >
          -
          <a :href="status.artists[0]?.href" target="_blank" class="link"
            ><b>{{ status.artists[0]?.name }}</b></a
          >
          <span
            v-if="status.artists.length > 1"
            style="color: var(--text-secondary)">
            (+{{ status.artists.length - 1 }} other)</span
          >
          on Spotify
        </span>
        <span class="extra-info"
          ><SlotText
            :text="msToMinutesAndSeconds(curDurationMsSpotify)"
            :options="{ skipUnchanged: true }" />
          <span> / </span>
          <SlotText
            :text="msToMinutesAndSeconds(status.durationMs)"
            :options="{ skipUnchanged: true }"
        /></span>
      </template>
    </div>
    <div
      v-if="thinkerImage"
      class="the-thinker"
      title="the thinkerrrr"
      :style="{
        maskImage: `url(${thinkerImage})`,
      }" />
  </template>
</template>

<script setup lang="ts">
import Icon from "~/components/ui/Icon.vue";
import { SlotText } from "slot-text/vue";
import "slot-text/style.css";

const { url: filterUrl } = useSketchFilter({ color: "var(--distant)" });

const dateFormat = new Intl.RelativeTimeFormat("en", { style: "short" });
const curDurationMsSpotify = ref(0);
const { backendUrl } = useRuntimeConfig().public;

type SpotifyStatus = {
  playing: boolean;
  title: string;
  href: string;
  durationMs: number;
  progressMs: number;
  artists: {
    name: string;
    href: string;
  }[];
  album: {
    name: string;
    href: string;
    imageUrl: string | null;
  };
};

type EcholotlStatus = {
  text: string;
  emoji: string;
  createdAt: string;
};

type StatusValue = SpotifyStatus | EcholotlStatus | "loading" | "error" | null;

const thinkerImages = [
  "/images/home/plushking.webp",
  "/images/home/doeh.webp",
  "/images/home/gamercube.webp",
  "/images/home/bf.webp",
  "/images/home/beetle.webp",
];

const getRandomThinkerImage = () => {
  const index = Math.floor(Math.random() * thinkerImages.length);
  return thinkerImages[index];
};

const thinkerImage = ref<string | null>(null);

const status = ref<StatusValue>("loading");
let spotifyRefetchTimeout: ReturnType<typeof setTimeout> | null = null;
let spotifyPollInterval: ReturnType<typeof setTimeout> | null = null;
let progressInterval: ReturnType<typeof setInterval> | null = null;

const SPOTIFY_POLL_INTERVAL_MS = 15_000;
const PROGRESS_TICK_MS = 1_000;

const clearSpotifyRefetchTimeout = () => {
  if (spotifyRefetchTimeout) {
    clearTimeout(spotifyRefetchTimeout);
    spotifyRefetchTimeout = null;
  }
};

const clearSpotifyPollInterval = () => {
  if (spotifyPollInterval) {
    clearTimeout(spotifyPollInterval);
    spotifyPollInterval = null;
  }
};

const clearProgressInterval = () => {
  if (progressInterval) {
    clearInterval(progressInterval);
    progressInterval = null;
  }
};

const msToMinutesAndSeconds = (ms: number) => {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

const isEcholotlStatus = (value: StatusValue): value is EcholotlStatus => {
  return (
    value !== null &&
    value !== "loading" &&
    value !== "error" &&
    "text" in value
  );
};

const isSpotifyStatus = (value: StatusValue): value is SpotifyStatus => {
  return (
    value !== null &&
    value !== "loading" &&
    value !== "error" &&
    "playing" in value
  );
};

const getCreatedAtRelativeTime = (createdAt: string) => {
  const createdAtDate = new Date(createdAt);
  const now = new Date();
  const diffMs = createdAtDate.getTime() - now.getTime();

  if (diffMs > -60000) {
    return dateFormat.format(Math.round(diffMs / 1000), "second");
  }
  if (diffMs > 60 * -60000) {
    return dateFormat.format(Math.round(diffMs / 60000), "minute");
  }
  if (diffMs > 24 * 60 * -60000) {
    return dateFormat.format(Math.round(diffMs / (60 * 60000)), "hour");
  }
  return dateFormat.format(Math.round(diffMs / (24 * 60 * 60000)), "day");
};

const startProgressTick = () => {
  clearProgressInterval();
  progressInterval = setInterval(() => {
    if (!isSpotifyStatus(status.value) || !status.value.playing) {
      clearProgressInterval();
      return;
    }

    const duration = status.value.durationMs;
    curDurationMsSpotify.value = Math.min(
      curDurationMsSpotify.value + PROGRESS_TICK_MS,
      duration,
    );
  }, PROGRESS_TICK_MS);
};

const scheduleSpotifyRefetchOnSongEnd = (playback: SpotifyStatus) => {
  clearSpotifyRefetchTimeout();

  const remainingMs = Math.max(playback.durationMs - playback.progressMs, 0);
  const refetchDelayMs = remainingMs + 1000;

  spotifyRefetchTimeout = setTimeout(() => {
    void refreshStatus();
  }, refetchDelayMs);
};

const fetchSpotifyStatus: () => Promise<SpotifyStatus | null> = async () => {
  try {
    const fetchStart = Date.now();
    const data = await fetch(`${backendUrl}/spotify`);
    if (data.status === 204) {
      clearSpotifyRefetchTimeout();
      return null;
    }
    if (!data.ok) {
      throw new Error(`HTTP error! status: ${data.status}`);
    }

    const json = (await data.json()) as SpotifyStatus;
    const fetchElapsed = Date.now() - fetchStart;
    curDurationMsSpotify.value =
      (json.progressMs ?? 0) + (json.playing ? fetchElapsed : 0);
    return json;
  } catch (err) {
    console.error("Error fetching Spotify status:", err);
    clearSpotifyRefetchTimeout();
    return null;
  }
};

const fetchEcholotlStatus: () => Promise<EcholotlStatus | null> = async () => {
  try {
    const data = await fetch(`${backendUrl}/status`);
    if (data.status === 204) {
      return null;
    }
    if (!data.ok) {
      throw new Error(`HTTP error! status: ${data.status}`);
    }

    const json = (await data.json()) as EcholotlStatus;
    return json;
  } catch (err) {
    console.error("Error fetching Echolotl status:", err);
    return null;
  }
};

const refreshStatus = async () => {
  const hasCustomStatusDisplayed = isEcholotlStatus(status.value);
  const spotifyResponse = await fetchSpotifyStatus();

  if (spotifyResponse && spotifyResponse.playing) {
    status.value = spotifyResponse;
    scheduleSpotifyRefetchOnSongEnd(spotifyResponse);
    startProgressTick();
    return;
  }

  clearSpotifyRefetchTimeout();
  clearProgressInterval();

  if (hasCustomStatusDisplayed) {
    return;
  }

  status.value = await fetchEcholotlStatus();
};

const startSpotifyPolling = () => {
  clearSpotifyPollInterval();
  const poll = async () => {
    const start = Date.now();
    await refreshStatus();
    const elapsed = Date.now() - start;
    console.log(`Spotify status refreshed in ${elapsed}ms`);
    const delay = Math.max(0, SPOTIFY_POLL_INTERVAL_MS - elapsed);
    spotifyPollInterval = setTimeout(() => void poll(), delay);
  };
  spotifyPollInterval = setTimeout(() => void poll(), SPOTIFY_POLL_INTERVAL_MS);
};

onMounted(async () => {
  thinkerImage.value = getRandomThinkerImage();
  await refreshStatus();
  startSpotifyPolling();
});

onBeforeUnmount(() => {
  clearSpotifyRefetchTimeout();
  clearSpotifyPollInterval();
  clearProgressInterval();
});
</script>

<style scoped lang="scss">
.status-think-bubble {
  position: relative;
  width: 100%;
  background-color: var(--surface);
  color: var(--text);
  padding: 0.5rem 1rem;
  border-radius: 999px;
  border: 1px solid var(--distant);
  box-shadow: inset 0 2px 12px var(--distant);

  &::after {
    content: "";
    position: absolute;
    bottom: -52px;
    right: 64px;
    mask-image: url("/images/home/think.webp");
    background-color: var(--surface);
    width: 49px;
    height: 49px;
    mask-repeat: no-repeat;
  }

  :not(.extra-info) {
    font-family: Lotl;
  }

  .emoji {
    position: absolute;
    top: -2rem;
    left: -2rem;
    font-size: 2.5rem;
  }

  .extra-info {
    position: absolute;
    top: -16px;
    left: 32px;
    background-color: var(--surface);
    padding: 0.125rem 0.5rem;
    border-radius: 999px;
    display: block;
    font-size: var(--small-text);
    color: var(--text-secondary);
  }
}

.the-thinker {
  position: relative;
  width: 100%;
  height: 150px;
  background-color: var(--text);
  mask-repeat: no-repeat;
  mask-size: contain;
  margin-top: 1rem;
  margin-left: 16px;
}
</style>
