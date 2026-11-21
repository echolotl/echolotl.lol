import paper from "paper";

/**
 * Represents a segment of a brush stroke.
 */
export interface BrushSegment {
  from: { x: number; y: number };
  to: { x: number; y: number };
  size: number;
}

/**
 * Represents a fill in the drawing, including its color, layer, and shape.
 */
interface Fill {
  id: number;
  color: string;
  layer: number;
  shape: paper.PathItem;
}

/**
 * Represents a change to a fill, including the fill and its index.
 */
interface FillChange {
  fill: Fill;
  index: number;
}

/**
 * Represents a change to a stroke, including the fills that were removed and added.
 */
interface StrokeChange {
  removed: FillChange[];
  added: FillChange[];
}

/**
 * This class handles the management of drawing (e.g. layers, undo, redo, and the path calculations).
 * It's meant to be similar to Flash/Animate, with paths being turned into fills and merged based on color and layer.
 */
export class FlashishDrawing {
  /**
   * The Paper.js scope used for managing the drawing.
   */
  private scope = new paper.PaperScope();
  /**
   * All fills in the current drawing.
   */
  private fills: Fill[] = [];
  /**
   * The undo stack for tracking changes.
   */
  private undoStack: StrokeChange[] = [];
  /**
   * The redo stack for tracking changes.
   */
  private redoStack: StrokeChange[] = [];
  /**
   * The next ID to be assigned to a new fill.
   */
  private nextId = 1;

  private _layerCount = 3;
  /**
   * The current color change being applied, if any.
   */
  private colorChange: {
    token: object;
    change: StrokeChange;
    previousRedo: StrokeChange[];
    ids: number[];
  } | null = null;

  constructor() {
    this.scope.setup(new this.scope.Size(1, 1));
  }

  /**
   * Validates that the given layer number is within the allowed range.
   * @param layer The layer number to validate.
   */
  private validateLayer(layer: number) {
    if (!Number.isSafeInteger(layer) || layer < 1 || layer > this._layerCount)
      throw new RangeError("Layer is outside the drawing's layer range");
  }

  /**
   * All fills in the current drawing.
   */
  get paths() {
    return this.fills.map(({ id, color, layer, shape }) => {
      const { x, y, width, height } = shape.bounds;
      return {
        id,
        color,
        layer,
        pathData: shape.pathData,
        bounds: { x, y, width, height },
      };
    });
  }

  /**
   * Whether there are changes that can be undone.
   */
  get canUndo() {
    return this.undoStack.length > 0;
  }

  /**
   * Whether there are changes that can be redone.
   */
  get canRedo() {
    return this.redoStack.length > 0;
  }

  /**
   * The possible number of layers in the drawing.
   */
  set layerCount(value: number) {
    if (!Number.isSafeInteger(value) || value < 1)
      throw new RangeError("Layer count must be a positive integer");
    this._layerCount = value;
  }

  get layerCount() {
    return this._layerCount;
  }

  /**
   * Undo the last change.
   */
  undo() {
    const change = this.undoStack.pop();
    if (!change) return;
    this.applyChange(change.added, change.removed);
    this.redoStack.push(change);
  }

  /**
   * Redo the last undone change.
   */
  redo() {
    const change = this.redoStack.pop();
    if (!change) return;
    this.applyChange(change.removed, change.added);
    this.undoStack.push(change);
  }

  /**
   * Apply a change to the drawing by removing and adding fills.
   * @param removed The fills to remove from the drawing.
   * @param added The fills to add to the drawing.
   */
  private applyChange(removed: FillChange[], added: FillChange[]) {
    const removedFills = new Set(removed.map(({ fill }) => fill));
    this.fills = this.fills.filter((fill) => !removedFills.has(fill));
    for (const { fill, index } of added) this.fills.splice(index, 0, fill);
  }

  /**
   * Record a change to the drawing by comparing the current fills with the previous state.
   * @param before The fills before the change.
   * @returns The change object containing removed and added fills.
   */
  private recordChange(before: Fill[]) {
    const beforeSet = new Set(before);
    const afterSet = new Set(this.fills);
    const change = {
      removed: before.flatMap((fill, index) =>
        afterSet.has(fill) ? [] : [{ fill, index }],
      ),
      added: this.fills.flatMap((fill, index) =>
        beforeSet.has(fill) ? [] : [{ fill, index }],
      ),
    };
    if (change.removed.length || change.added.length) {
      this.undoStack.push(change);
      this.redoStack = [];
    }
    return change;
  }

  /**
   * Check if two path items overlap.
   * @param first The first path item.
   * @param second The second path item.
   * @returns True if the path items overlap, false otherwise.
   */
  private overlaps(first: paper.PathItem, second: paper.PathItem) {
    return (
      first.bounds.left <= second.bounds.right &&
      first.bounds.right >= second.bounds.left &&
      first.bounds.top <= second.bounds.bottom &&
      first.bounds.bottom >= second.bounds.top &&
      (first.intersects(second) ||
        !first.intersect(second, { insert: false }).isEmpty())
    );
  }

  /**
   * Insert a fill into the drawing and merge it with overlapping fills of the same layer and color.
   * @param fill The fill to insert and merge.
   * @param index The index at which to insert the fill.
   * @returns The IDs of the merged fills.
   */
  private insertMerged(fill: Fill, index: number) {
    let shape = fill.shape;
    const mergedIds: number[] = [];
    let found = true;
    while (found) {
      found = false;
      for (let i = 0; i < this.fills.length; i++) {
        const other = this.fills[i]!;
        if (
          other.layer !== fill.layer ||
          other.color !== fill.color ||
          !this.overlaps(shape, other.shape)
        )
          continue;
        shape = shape.unite(other.shape, { insert: false });
        mergedIds.push(other.id);
        this.fills.splice(i, 1);
        if (i < index) index--;
        found = true;
        break;
      }
    }
    this.fills.splice(index, 0, { ...fill, shape });
    return mergedIds;
  }

  /**
   * Get the IDs of all fills that overlap with a given rectangle.
   * @param from The top-left corner of the rectangle.
   * @param to The bottom-right corner of the rectangle.
   * @returns The IDs of the overlapping fills.
   */
  pathsInRectangle(
    from: { x: number; y: number },
    to: { x: number; y: number },
  ) {
    const rectangle = new this.scope.Path.Rectangle({
      rectangle: new this.scope.Rectangle(
        new this.scope.Point(Math.min(from.x, to.x), Math.min(from.y, to.y)),
        new this.scope.Point(Math.max(from.x, to.x), Math.max(from.y, to.y)),
      ),
      insert: false,
    });
    return this.fills
      .filter((fill) => this.overlaps(fill.shape, rectangle))
      .map((fill) => fill.id);
  }

  /**
   * Replace the paths with the given IDs by applying an update function to them.
   * @param ids The IDs of the fills to replace.
   * @param update The function to apply to each fill.
   * @returns The IDs of the resulting fills.
   */
  private replacePaths(ids: number[], update: (fill: Fill) => Fill) {
    const selected = new Set(ids);
    this.fills = this.fills
      .map((fill) => (selected.has(fill.id) ? update(fill) : fill))
      .sort((a, b) => a.layer - b.layer);
    return this.fills
      .filter((fill) => selected.has(fill.id))
      .map(({ id }) => id);
  }

  /**
   * Merge moved fills with overlapping fills of the same color and layer.
   * @param ids The IDs of the moved fills to merge.
   */
  mergeMovedPaths(ids: number[]) {
    const before = this.fills.slice();
    for (const id of ids) {
      const index = this.fills.findIndex((fill) => fill.id === id);
      if (index === -1) continue;
      const fill = this.fills[index]!;
      if (
        !this.fills.some(
          (other) =>
            other !== fill &&
            other.layer === fill.layer &&
            other.color === fill.color &&
            this.overlaps(fill.shape, other.shape),
        )
      )
        continue;
      this.fills.splice(index, 1);
      this.insertMerged(fill, index);
    }
    this.recordChange(before);
  }

  /**
   * Move the paths with the given IDs by the specified delta.
   * @param ids The IDs of the fills to move.
   * @param dx The delta in the x direction.
   * @param dy The delta in the y direction.
   * @returns The IDs of the moved fills.
   */
  movePaths(ids: number[], dx: number, dy: number) {
    if ((!dx && !dy) || !ids.length) return ids;
    const before = this.fills.slice();
    const result = this.replacePaths(ids, (fill) => {
      const shape = fill.shape.clone({ insert: false });
      shape.translate(new this.scope.Point(dx, dy));
      return { ...fill, shape };
    });
    this.recordChange(before);
    return result;
  }

  /**
   * Move the paths with the given IDs up or down by one layer.
   * @param ids The IDs of the fills to move.
   * @param direction The direction to move the layers (-1 for down, 1 for up).
   * @returns The IDs of the moved fills.
   */
  movePathsByLayer(ids: number[], direction: -1 | 1) {
    const selected = this.fills.filter((fill) => ids.includes(fill.id));
    if (
      !selected.length ||
      selected.some(
        (fill) =>
          fill.layer + direction < 1 ||
          fill.layer + direction > this.layerCount,
      )
    )
      return ids;
    const before = this.fills.slice();
    const result = this.replacePaths(ids, (fill) => ({
      ...fill,
      layer: fill.layer + direction,
    }));
    this.recordChange(before);
    return result;
  }

  /**
   * Set the color of the paths with the given IDs.
   * @param ids The IDs of the fills to color.
   * @param color The new color to apply.
   * @param token An optional token to track ongoing color changes.
   * @returns The IDs of the fills that were colored.
   */
  setPathsColor(ids: number[], color: string, token?: object) {
    const ongoing = this.colorChange;
    let originalIds = ids;
    let previousRedo = this.redoStack;
    if (
      token &&
      ongoing?.token === token &&
      this.undoStack.at(-1) === ongoing.change
    ) {
      this.applyChange(ongoing.change.added, ongoing.change.removed);
      this.undoStack.pop();
      originalIds = ongoing.ids;
      previousRedo = ongoing.previousRedo;
    } else if (
      this.fills
        .filter((fill) => ids.includes(fill.id))
        .every((fill) => fill.color === color)
    ) {
      return ids;
    }
    const before = this.fills.slice();
    if (
      before
        .filter((fill) => originalIds.includes(fill.id))
        .every((fill) => fill.color === color)
    ) {
      this.redoStack = previousRedo;
      this.colorChange = null;
      return originalIds;
    }
    const result = this.replacePaths(originalIds, (fill) => ({
      ...fill,
      color,
    }));
    const change = this.recordChange(before);
    this.colorChange = token
      ? { token, change, previousRedo, ids: originalIds }
      : null;
    return result;
  }

  /**
   * Delete the paths with the given IDs.
   * @param ids The IDs of the fills to delete.
   */
  deletePaths(ids: number[]) {
    const before = this.fills.slice();
    const selected = new Set(ids);
    this.fills = this.fills.filter((fill) => !selected.has(fill.id));
    this.recordChange(before);
  }

  /**
   * Split a compound shape into its constituent paths.
   * @param shape The shape to split.
   * @returns An array of individual path items.
   */
  private splitShape(shape: paper.PathItem): paper.PathItem[] {
    if (!(shape instanceof this.scope.CompoundPath))
      return shape.isEmpty() ? [] : [shape];
    shape.reorient(true, true);
    const contours = shape.children as paper.Path[];
    const outer = contours.filter((path) => path.clockwise);
    const groups = outer.map((path) => [path]);
    for (const hole of contours.filter((path) => !path.clockwise)) {
      let owner = -1;
      for (const [index, path] of outer.entries()) {
        if (
          path.contains(hole.interiorPoint) &&
          (owner === -1 || path.area < outer[owner]!.area)
        )
          owner = index;
      }
      if (owner !== -1) groups[owner]!.push(hole);
    }
    for (let i = 0; i < groups.length; i++) {
      for (let j = i + 1; j < groups.length; ) {
        if (groups[i]!.some((a) => groups[j]!.some((b) => a.intersects(b)))) {
          groups[i]!.push(...groups[j]!);
          groups.splice(j, 1);
          j = i + 1;
        } else {
          j++;
        }
      }
    }
    return groups.map((group) =>
      group.length === 1
        ? group[0]!.clone({ insert: false })
        : new this.scope.CompoundPath({
            children: group.map((path) => path.clone({ insert: false })),
            insert: false,
          }),
    );
  }

  /**
   * Move a path by the specified delta.
   * @param id The ID of the fill to move.
   * @param dx The delta in the x direction.
   * @param dy The delta in the y direction.
   */
  movePath(id: number, dx: number, dy: number) {
    if (!dx && !dy) return;
    const index = this.fills.findIndex((fill) => fill.id === id);
    if (index === -1) return;
    const fill = this.fills[index]!;
    const shape = fill.shape.clone({ insert: false });
    shape.translate(new this.scope.Point(dx, dy));
    const before = this.fills.slice();
    this.fills.splice(index, 1);
    this.insertMerged({ ...fill, shape }, index);
    this.recordChange(before);
  }

  /**
   * Move a path to a different layer.
   * @param id The ID of the fill to move.
   * @param layer The target layer.
   */
  movePathToLayer(id: number, layer: number) {
    this.validateLayer(layer);
    const index = this.fills.findIndex((fill) => fill.id === id);
    if (index === -1) return;
    const fill = this.fills[index]!;
    if (fill.layer === layer) return;
    const before = this.fills.slice();
    this.fills.splice(index, 1);
    const nextIndex = this.fills.findIndex((item) => item.layer > layer);
    this.insertMerged(
      { ...fill, layer },
      nextIndex === -1 ? this.fills.length : nextIndex,
    );
    this.recordChange(before);
  }

  /**
   * Set the color of a path.
   * @param id The ID of the fill to color.
   * @param color The new color to apply.
   * @param token An optional token to track ongoing color changes.
   */
  setPathColor(id: number, color: string, token?: object) {
    const index = this.fills.findIndex((fill) => fill.id === id);
    if (index === -1) return;
    let fill = this.fills[index]!;
    if (fill.color === color) return;
    const ongoing = this.colorChange;
    if (
      token &&
      ongoing?.token === token &&
      this.undoStack.at(-1) === ongoing.change &&
      ongoing.change.added[0]?.fill === fill
    ) {
      this.applyChange(ongoing.change.added, ongoing.change.removed);
      this.undoStack.pop();
      fill = this.fills.find((item) => item.id === id)!;
      if (color === fill.color) {
        this.redoStack = ongoing.previousRedo;
        this.colorChange = null;
        return;
      }
    }
    const before = this.fills.slice();
    const fillIndex = this.fills.indexOf(fill);
    this.fills.splice(fillIndex, 1);
    this.insertMerged({ ...fill, color }, fillIndex);
    const previousRedo =
      ongoing && ongoing.token === token
        ? ongoing.previousRedo
        : this.redoStack;
    const change = this.recordChange(before);
    this.colorChange = token
      ? { token, change, previousRedo, ids: [id] }
      : null;
  }

  /**
   * Delete a path.
   * @param id The ID of the fill to delete.
   */
  deletePath(id: number) {
    const index = this.fills.findIndex((fill) => fill.id === id);
    if (index === -1) return;
    const change = {
      removed: [{ fill: this.fills[index]!, index }],
      added: [],
    };
    this.applyChange(change.removed, change.added);
    this.undoStack.push(change);
    this.redoStack = [];
  }

  /**
   * Add a stroke to the canvas.
   * @param segments The brush segments that make up the stroke.
   * @param color The color of the stroke, or null to only affect existing fills.
   * @param layer The layer to add the stroke to.
   */
  addStroke(segments: BrushSegment[], color: string | null, layer: number) {
    this.validateLayer(layer);
    if (!segments.length) return;

    const runs: BrushSegment[][] = [];
    for (const segment of segments) {
      const run = runs.at(-1);
      const previous = run?.at(-1);
      if (
        !previous ||
        previous.to.x !== segment.from.x ||
        previous.to.y !== segment.from.y
      ) {
        runs.push([segment]);
      } else {
        run!.push(segment);
      }
    }
    let shapes: paper.PathItem[] = runs.flatMap((run) =>
      this.smoothStroke(run).map((segment) => this.segmentToFill(segment)),
    );
    while (shapes.length > 1) {
      const merged: paper.PathItem[] = [];
      for (let i = 0; i < shapes.length; i += 2) {
        const first = shapes[i]!;
        const second = shapes[i + 1];
        merged.push(second ? first.unite(second, { insert: false }) : first);
      }
      shapes = merged;
    }

    const stroke = shapes[0]!;
    const before = this.fills.slice();
    const remaining: Fill[] = [];
    for (const fill of this.fills) {
      if (
        fill.layer !== layer ||
        (color !== null && fill.color === color) ||
        !this.overlaps(fill.shape, stroke)
      ) {
        remaining.push(fill);
        continue;
      }
      const shape = fill.shape.subtract(stroke, { insert: false });
      if (shape.compare(fill.shape)) {
        remaining.push(fill);
        continue;
      }
      for (const [index, piece] of this.splitShape(shape).entries()) {
        remaining.push({
          ...fill,
          id: index === 0 ? fill.id : this.nextId++,
          shape: piece,
        });
      }
    }
    this.fills = remaining;
    if (color !== null) {
      for (const shape of this.splitShape(stroke)) {
        const nextIndex = this.fills.findIndex((item) => item.layer > layer);
        this.insertMerged(
          { id: this.nextId++, color, layer, shape },
          nextIndex === -1 ? this.fills.length : nextIndex,
        );
      }
    }
    this.recordChange(before);
  }

  /**
   * Smooth a stroke by interpolating its segments.
   * @param segments The brush segments that make up the stroke.
   * @returns The smoothed brush segments.
   */
  private smoothStroke(segments: BrushSegment[]): BrushSegment[] {
    const lengths = segments.map(({ from, to }) =>
      Math.hypot(to.x - from.x, to.y - from.y),
    );
    const totalLength = lengths.reduce((sum, length) => sum + length, 0);
    if (!totalLength || lengths.filter((length) => length > 0).length < 2) {
      return segments;
    }

    const centerline = new this.scope.Path({ insert: false });
    centerline.add(new this.scope.Point(segments[0]!.from));
    for (const [index, segment] of segments.entries()) {
      if (lengths[index]) centerline.add(new this.scope.Point(segment.to));
    }

    const averageSize =
      segments.reduce((sum, segment) => sum + segment.size, 0) /
      segments.length;
    centerline.simplify(Math.min(2, Math.max(0.5, averageSize / 2)));
    centerline.flatten(0.25);
    const smoothedLength = centerline.length;
    if (!smoothedLength) return segments;

    const offsets: number[] = [];
    let flattenedLength = 0;
    for (const curve of centerline.curves) {
      flattenedLength += curve.length;
      offsets.push(flattenedLength);
    }

    const result: BrushSegment[] = [];
    let originalLength = 0;
    let offsetIndex = 0;
    for (const [index, segment] of segments.entries()) {
      const start = (originalLength / totalLength) * smoothedLength;
      originalLength += lengths[index]!;
      const end = (originalLength / totalLength) * smoothedLength;
      let from = centerline.getPointAt(start)!;
      while (offsetIndex < offsets.length && offsets[offsetIndex]! < end) {
        const offset = offsets[offsetIndex++]!;
        if (offset <= start) continue;
        const to = centerline.getPointAt(offset)!;
        result.push({ from, to, size: segment.size });
        from = to;
      }
      const to = centerline.getPointAt(end)!;
      result.push({ from, to, size: segment.size });
    }
    return result;
  }

  /**
   * Convert a brush segment to a fillable path.
   * @param segment The brush segment to convert.
   * @returns A path item representing the fill for the segment.
   */
  private segmentToFill({ from, to, size }: BrushSegment): paper.PathItem {
    const radius = size / 2;
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const length = Math.hypot(dx, dy);
    if (!length) {
      return new this.scope.Path.Circle({
        center: [from.x, from.y],
        radius,
        insert: false,
      });
    }

    const shape = new this.scope.Path.Rectangle({
      rectangle: new this.scope.Rectangle(
        from.x - radius,
        from.y - radius,
        length + size,
        size,
      ),
      radius: new this.scope.Size(radius, radius),
      insert: false,
    });
    shape.rotate((Math.atan2(dy, dx) * 180) / Math.PI, [from.x, from.y]);
    return shape;
  }
}
