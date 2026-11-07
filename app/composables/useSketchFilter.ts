import { normalizeHex } from "~/utils/color";
import { hashString } from "~/utils/index";

export interface SketchFilterOptions {
  color?: string;
  stdDeviation?: number;
  intercept?: number;
  seed?: number;
}

/**
 * Options for configuring a sketch filter.
 */
export interface SketchFilterDef {
  id: string;
  color: string;
  stdDeviation: number;
  intercept: number;
  seed: number;
}

const DEFAULTS = {
  color: "var(--primary)",
  stdDeviation: 2,
  intercept: -5,
  seed: 1,
};

// Client-only usage counts; kept out of useState so they aren't serialized
const refCounts = new Map<string, number>();

/**
 * Registers a sketch-border filter in the shared registry rendered by
 * `SketchFilterHost`. Identical options share a single SVG filter.
 */
export function useSketchFilter(
  options: MaybeRefOrGetter<SketchFilterOptions> = {},
) {
  const filters = useState<Record<string, SketchFilterDef>>(
    "sketch-filters",
    () => ({}),
  );

  const def = computed<SketchFilterDef>(() => {
    const o = toValue(options);
    const color = normalizeHex(o.color ?? DEFAULTS.color);
    const stdDeviation = o.stdDeviation ?? DEFAULTS.stdDeviation;
    const intercept = o.intercept ?? DEFAULTS.intercept;
    const seed = o.seed ?? DEFAULTS.seed;
    const id = `sketch-${hashString(`${color}|${stdDeviation}|${intercept}|${seed}`)}`;
    return { id, color, stdDeviation, intercept, seed };
  });

  function acquire(d: SketchFilterDef) {
    if (!filters.value[d.id]) filters.value[d.id] = d;
    if (import.meta.client) {
      refCounts.set(d.id, (refCounts.get(d.id) ?? 0) + 1);
    }
  }

  function release(id: string) {
    if (!import.meta.client) return;
    const count = (refCounts.get(id) ?? 1) - 1;
    if (count > 0) {
      refCounts.set(id, count);
      return;
    }
    refCounts.delete(id);
    delete filters.value[id];
  }

  let current = def.value;
  acquire(current);

  watch(def, (next) => {
    if (next.id === current.id) return;
    const previous = current;
    current = next;
    acquire(next);
    release(previous.id);
  });

  onScopeDispose(() => release(current.id));

  return {
    id: computed(() => def.value.id),
    url: computed(() => `url(#${def.value.id})`),
  };
}
