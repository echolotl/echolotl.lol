import * as yaml from "js-yaml";
import * as fs from "node:fs";
import * as path from "node:path";
import { Logger } from "../../logger";
import type { Art, ArtImage, Character } from "../../../types";
import { context } from "./context";
import { ask } from "./cli";

export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function formatYaml(data: object): string {
  return yaml.dump(data, {
    indent: 2,
    lineWidth: -1,
    noRefs: true,
    quotingType: "\"",
    sortKeys: false,
  });
}

export function generateArtYAML(art: Art, savePath: string): void {
  const yamlContent = formatYaml(art);
  if (context.dryRun) {
    Logger.warning(
      `[DRYRUN] Would save art metadata to ${Logger.fmtBold(savePath)}`,
    );
    return;
  }
  const yamlDir = path.dirname(savePath);
  fs.mkdirSync(yamlDir, { recursive: true });
  fs.writeFileSync(savePath, yamlContent);
  Logger.success(`Saved art metadata to ${Logger.fmtBold(savePath)}`);
}

export async function buildArtGallery(
  paths: string[],
  slug: string,
): Promise<ArtImage[] | null> {
  const artImages: ArtImage[] = [];
  let baseIndex = 0;

  for (let i = 0; i < paths.length; i++) {
    const imagePath = paths[i]!;
    Logger.info(
      `Processing image ${i + 1} of ${paths.length}: ${Logger.fmtBold(imagePath)}`,
    );

    let attachAsVariant = false;
    if (artImages.length > 0) {
      const answer = await ask({
        prompt: "▌ Attach as variant of previous image? (y/N): ",
        default: "N",
      });
      attachAsVariant = answer.charAt(0).toLowerCase() === "y";
    }

    if (attachAsVariant) {
      const base = artImages[baseIndex]!;
      if (!base.variants) {
        base.variants = [];
      }

      Logger.question("▌ Enter a name for this variant:");
      const label = await ask();

      Logger.question("▌ Enter alt text for this variant (optional):");
      const alt = await ask();

      base.variants.push({
        image_url: path.join("/art", slug, path.basename(imagePath)),
        label: label || undefined,
        alt: alt || undefined,
      });
    } else {
      Logger.question("▌ Image title (optional):");
      const title = await ask();

      Logger.question("▌ Enter alt text for this image (optional):");
      const alt = await ask();
      const titleSlug = title ? generateSlug(title) : slug;
      let idCandidate = titleSlug;
      let idSuffix = 1;
      while (artImages.some((img) => img.id === idCandidate)) {
        idSuffix++;
        idCandidate = `${titleSlug}-${idSuffix}`;
      }
      const id = idCandidate;

      artImages.push({
        id,
        title: title || undefined,
        image_url: path.join("/art", slug, path.basename(imagePath)),
        alt: alt || undefined,
      });
      baseIndex = artImages.length - 1;
    }
  }

  return artImages.length > 0 ? artImages : null;
}

export function getArtBySlug(slug: string): Art | null {
  const artDir = path.join(process.cwd(), "content/art");
  const generalArtPath = path.join(artDir, "general", `${slug}.yml`);

  let artPath = generalArtPath;
  if (!fs.existsSync(artPath)) {
    const charactersDir = path.join(artDir, "characters");
    if (fs.existsSync(charactersDir)) {
      const characterFolders = fs
        .readdirSync(charactersDir, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name);

      for (const characterFolder of characterFolders) {
        const candidatePath = path.join(
          charactersDir,
          characterFolder,
          `${slug}.yml`,
        );
        if (fs.existsSync(candidatePath)) {
          artPath = candidatePath;
          break;
        }
      }
    }
  }

  if (!fs.existsSync(artPath)) {
    Logger.error(`Couldn't find art with slug "${slug}"`);
    return null;
  }
  try {
    const fileContent = fs.readFileSync(artPath, "utf8");
    const art = yaml.load(fileContent) as Art;
    return art;
  } catch (e) {
    Logger.error(`Error reading art file for slug "${slug}": ${e}`);
    return null;
  }
}

export function getAllArts(): Art[] {
  const artFiles = getAllArtFiles();
  const arts: Art[] = [];
  for (const artFile of artFiles) {
    const slug = path.basename(artFile, ".yml");
    const art = getArtBySlug(slug);
    if (art) {
      arts.push(art);
    }
  }

  return arts;
}

export function getAllArtFiles(): string[] {
  const artDir = path.join(process.cwd(), "content/art");
  const artFiles: string[] = [];

  const generalDir = path.join(artDir, "general");
  if (fs.existsSync(generalDir)) {
    const generalFiles = fs.readdirSync(generalDir);
    for (const file of generalFiles) {
      if (file.endsWith(".yml")) {
        artFiles.push(path.join(generalDir, file));
      }
    }
  }

  const charactersDir = path.join(artDir, "characters");
  if (fs.existsSync(charactersDir)) {
    const characterFolders = fs
      .readdirSync(charactersDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
    for (const characterFolder of characterFolders) {
      const characterDir = path.join(charactersDir, characterFolder);
      const characterFiles = fs.readdirSync(characterDir);
      for (const file of characterFiles) {
        if (file.endsWith(".yml")) {
          artFiles.push(path.join(characterDir, file));
        }
      }
    }
  }

  return artFiles;
}

export function getCharacterBySlug(slug: string): Character {
  const characterPath = path.join("content/characters", `${slug}.md`);
  if (!fs.existsSync(characterPath)) {
    throw new Error(`Character with slug "${slug}" not found.`);
  }
  try {
    // Get the frontmatter content between the first two --- lines
    const fileContent = fs.readFileSync(characterPath, "utf8");
    const frontmatterMatch = fileContent.match(
      /^---\s*[\r\n]+([\s\S]*?)[\r\n]+---/,
    );
    if (!frontmatterMatch || !frontmatterMatch[1]) {
      throw new Error(
        `No frontmatter found in character file for slug "${slug}".`,
      );
    }
    const character = yaml.load(frontmatterMatch[1]) as Character;
    return character;
  } catch (e) {
    throw new Error(`Error reading character file for slug "${slug}": ${e}`);
  }
}

export function getAllCharacters(): Character[] {
  const characterFiles = getAllCharacterFiles();
  const characters: Character[] = [];
  for (const characterFile of characterFiles) {
    const slug = path.basename(characterFile, ".md");
    try {
      const character = getCharacterBySlug(slug);
      characters.push(character);
    } catch (e) {
      Logger.error(`Error loading character with slug "${slug}": ${e}`);
    }
  }
  return characters;
}

export function getAllCharacterFiles(): string[] {
  const charactersDir = path.join(process.cwd(), "content/characters");
  const characterFiles: string[] = [];
  if (fs.existsSync(charactersDir)) {
    const files = fs.readdirSync(charactersDir);
    for (const file of files) {
      if (file.endsWith(".md")) {
        characterFiles.push(path.join(charactersDir, file));
      }
    }
  }
  return characterFiles;
}

export function isActualCharacter(slug: string): boolean {
  try {
    getCharacterBySlug(slug);
    return true;
  } catch {
    return false;
  }
}

export function slugExists(slug: string): boolean {
  const artDir = path.join(process.cwd(), "content/art");
  if (fs.existsSync(path.join(artDir, "general", `${slug}.yml`))) {
    return true;
  }

  const charactersDir = path.join(artDir, "characters");
  if (!fs.existsSync(charactersDir)) {
    return false;
  }

  return fs
    .readdirSync(charactersDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .some((entry) =>
      fs.existsSync(path.join(charactersDir, entry.name, `${slug}.yml`)),
    );
}
