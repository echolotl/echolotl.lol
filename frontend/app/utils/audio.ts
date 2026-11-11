// Small wrapper over web audio
export function createSoundPlayer() {
  let audioCtx: AudioContext | null = new AudioContext();

  async function load(url: string): Promise<AudioBuffer | null> {
    const ctx = audioCtx;
    if (!ctx) return null;
    try {
      const res = await fetch(url);
      return await ctx.decodeAudioData(await res.arrayBuffer());
    } catch {
      return null;
    }
  }

  function play(buffer: AudioBuffer | null | undefined, playbackRate = 1) {
    if (!audioCtx || !buffer) return;
    if (audioCtx.state === "suspended") audioCtx.resume();
    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = playbackRate;
    source.connect(audioCtx.destination);
    source.start(0);
  }

  function close() {
    audioCtx?.close();
    audioCtx = null;
  }

  return { load, play, close };
}

export type SoundPlayer = ReturnType<typeof createSoundPlayer>;
