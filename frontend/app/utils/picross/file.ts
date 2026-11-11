import type {
  PicrossMetadata,
  PicrossPalette,
  PicrossSize,
  PicrossSolution,
} from "~/utils/picross";
import { isValidSolution } from "~/utils/picross";

// What a saved puzzle file holds. Hints are derived from the solution on load, never stored.
export type PicrossPuzzleData = {
  majorVersion: number;
  minorVersion: number;
  metadata: PicrossMetadata;
  size: PicrossSize;
  solution: PicrossSolution;
  palette: PicrossPalette;
};

// V1: [magic, major, minor, width, height, solution,
// color count, length-prefixed colors, color indexes per tile, metadata]
// Metadata runs to the end of the file as UTF-8 text fields separated by null bytes:
// title, author, source, created_at, modified_at. Empty means unset.
// An author or source object is stored as its two parts joined by a unit separator.

const FIELD_SEPARATOR = "\0";
const PART_SEPARATOR = "\x1f";
const METADATA_FIELD_COUNT = 5;

function invalidFile(reason?: string): never {
  throw new Error(
    reason ? `Invalid puzzle file: ${reason}` : "Invalid puzzle file",
  );
}

function checkText(text: string) {
  if (text.includes(FIELD_SEPARATOR) || text.includes(PART_SEPARATOR)) {
    throw new Error("Puzzle details contain unsupported control characters");
  }
  return text;
}

function encodePair(a: string, b: string) {
  return checkText(a) + PART_SEPARATOR + checkText(b);
}

function encodeMetadata(metadata: PicrossMetadata) {
  const { title, author, source, created_at, modified_at } = metadata;
  return [
    checkText(title ?? ""),
    typeof author === "object"
      ? encodePair(author.name, author.id ?? "")
      : checkText(author ?? ""),
    typeof source === "object"
      ? encodePair(source.name, String(source.url))
      : checkText(source ?? ""),
    checkText(created_at),
    checkText(modified_at),
  ];
}

function decodeMetadata(fields: string[]): PicrossMetadata {
  if (fields.length !== METADATA_FIELD_COUNT) invalidFile("corrupt metadata");
  const [title, author, source, created_at, modified_at] = fields as [
    string,
    string,
    string,
    string,
    string,
  ];

  const metadata: PicrossMetadata = { created_at, modified_at };
  if (title) metadata.title = title;
  if (author) {
    const [name, id] = author.split(PART_SEPARATOR);
    metadata.author = id === undefined ? { name: author } : { name: name!, id };
  }
  if (source) {
    const [name, url] = source.split(PART_SEPARATOR);
    metadata.source =
      url === undefined ? { name: source } : { name: name!, url };
  }
  return metadata;
}

// Serializes a puzzle into the custom file format
export function savePicrossPuzzle(
  puzzle: Omit<PicrossPuzzleData, "majorVersion" | "minorVersion">,
): Uint8Array {
  const { size, solution, palette, metadata } = puzzle;
  const textEncoder = new TextEncoder();

  const bytes: number[] = [
    ...MAGIC_HEADER,
    CURRENT_MAJOR_VERSION,
    CURRENT_MINOR_VERSION,
    size.width,
    size.height,
  ];
  for (const cell of solution.flat()) bytes.push(cell ? 1 : 0);

  if (palette.colors.length > MAX_PALETTE_SIZE) {
    throw new Error(`Puzzles can use at most ${MAX_PALETTE_SIZE} colors`);
  }
  bytes.push(palette.colors.length);
  for (const color of palette.colors) {
    const encoded = textEncoder.encode(color);
    if (encoded.length > MAX_COLOR_BYTES) {
      throw new Error("A tile color is too long to save");
    }
    bytes.push(encoded.length, ...encoded);
  }
  for (const index of palette.indices.flat()) {
    bytes.push(index === null ? 0 : index + 1);
  }

  const metadataBytes = textEncoder.encode(
    encodeMetadata(metadata).join(FIELD_SEPARATOR),
  );
  for (const byte of metadataBytes) bytes.push(byte);

  return Uint8Array.from(bytes);
}

// Parses the custom file format back into a puzzle
export function loadPicrossPuzzle(buffer: Uint8Array): PicrossPuzzleData {
  if (buffer.length < MAGIC_HEADER.length + 4) invalidFile();
  for (let i = 0; i < MAGIC_HEADER.length; i++) {
    if (buffer[i] !== MAGIC_HEADER[i]) invalidFile();
  }

  let offset = MAGIC_HEADER.length;
  function read(name: string) {
    const value = buffer[offset++];
    if (value === undefined) invalidFile(`missing ${name}`);
    return value;
  }
  function readBytes(length: number, name: string) {
    if (offset + length > buffer.length) invalidFile(`missing ${name}`);
    const slice = buffer.subarray(offset, offset + length);
    offset += length;
    return slice;
  }
  const textDecoder = new TextDecoder("utf-8", { fatal: true });
  function decode(bytes: Uint8Array) {
    try {
      return textDecoder.decode(bytes);
    } catch {
      return invalidFile("corrupt text");
    }
  }

  const majorVersion = read("major version");
  const minorVersion = read("minor version");
  if (majorVersion !== CURRENT_MAJOR_VERSION) {
    invalidFile(`unsupported version ${majorVersion}.${minorVersion}`);
  }

  const size: PicrossSize = { width: read("width"), height: read("height") };
  for (const side of [size.width, size.height]) {
    if (side < MIN_BOARD_SIZE || side > MAX_BOARD_SIZE) {
      invalidFile(`size must be ${MIN_BOARD_SIZE}-${MAX_BOARD_SIZE}`);
    }
  }

  const solution: PicrossSolution = [];
  for (let y = 0; y < size.height; y++) {
    const row: boolean[] = [];
    for (let x = 0; x < size.width; x++) {
      const cell = read("solution tile");
      if (cell > 1) invalidFile("corrupt solution");
      row.push(cell === 1);
    }
    solution.push(row);
  }

  const paletteLength = read("palette length");
  const colors: string[] = [];
  for (let i = 0; i < paletteLength; i++) {
    colors.push(decode(readBytes(read("color length"), "color")));
  }

  const indices: (number | null)[][] = [];
  for (let y = 0; y < size.height; y++) {
    const row: (number | null)[] = [];
    for (let x = 0; x < size.width; x++) {
      const index = read("tile color");
      if (index > colors.length) invalidFile("corrupt tile colors");
      row.push(index === 0 ? null : index - 1);
    }
    indices.push(row);
  }
  const palette: PicrossPalette = { indices, colors };

  const metadata = decodeMetadata(
    decode(readBytes(buffer.length - offset, "metadata")).split(
      FIELD_SEPARATOR,
    ),
  );

  if (!isValidSolution(solution, size)) {
    invalidFile("corrupt solution");
  }

  return { majorVersion, minorVersion, metadata, size, solution, palette };
}
