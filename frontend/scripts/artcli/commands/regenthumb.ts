import { Logger } from "../../logger";
import { exit } from "../utils/cli";
import { generateThumbnail } from "../utils/image";
import { context } from "../utils/context";
import { formatYaml, getAllArts } from "../utils/art";
import * as fs from "fs";
import * as path from "path";
import { load } from "js-yaml";
import { pushToRemote } from "../utils/git";
import type { ThumbnailAnchor } from "../../../types";

const extensions = [".png", ".jpg", ".jpeg", ".webp", ".gif"];

let thumbnailDataMap = new Map<string, ThumbnailMetadata>();

type ThumbnailMetadata = {
  thumbnail_anchor?: ThumbnailAnchor;
};

function buildThumbnailMetadata(): void {
  const arts = getAllArts();
  for (const art of arts) {
    const images = Array.isArray(art.images) ? art.images : [];
    for (const image of images) {
      const key = path.parse(image.image_url).name;
      thumbnailDataMap.set(key, {
        thumbnail_anchor: image.thumbnail_anchor,
      });

      if (!Array.isArray(image.variants)) continue;
      for (const variantImage of image.variants) {
        const variantKey = path.parse(variantImage.image_url).name;
        thumbnailDataMap.set(variantKey, {
          thumbnail_anchor: variantImage.thumbnail_anchor,
        });
      }
    }
  }

  return;
}

async function updateContentFile(
  imagePath: string,
  thumbnailPath: string,
): Promise<void> {
  if (context.dryRun) {
    Logger.warning(
      `[DRYRUN] Would update content file for ${Logger.fmtBold(imagePath)} with thumbnail ${Logger.fmtBold(thumbnailPath)}`,
    );
    return;
  }
  try {
    // Convert public art path to content art path
    const relativePath = path.relative("public/art", imagePath);
    const [category, ...pathParts] = relativePath.split(/[/\\]/);

    let searchDir: string;
    if (category === "characters" && pathParts.length >= 2) {
      // CHARACTERS: search in content/art/characters/:slug/
      const characterName = pathParts[0];
      searchDir = path.join("content", "art", "characters", characterName!);
    } else if (category === "general") {
      // GENERAL: search in content/art/general/
      searchDir = path.join("content", "art", "general");
    } else {
      // If the image is not in a recognized category, skip it
      Logger.warning(
        `Image ${imagePath} is not in a recognized category, skipping...`,
      );
      return;
    }

    if (!fs.existsSync(searchDir)) {
      Logger.warning(
        `Search directory ${searchDir} does not exist, skipping...`,
      );
      return;
    }

    // Generate the expected image URL that should be in the YAML file
    const expectedImageUrl =
      "/" + path.relative("public", imagePath).replace(/\\/g, "/");

    // Search through all YAML files in the directory
    const files = fs.readdirSync(searchDir);
    for (const file of files) {
      if (!file.endsWith(".yml")) continue;

      const yamlPath = path.join(searchDir, file);
      try {
        const yamlContent = fs.readFileSync(yamlPath, "utf8");
        const data = load(yamlContent) as Record<string, unknown>;
        const expectedThumbnailUrl =
          "/" + path.relative("public", thumbnailPath).replace(/\\/g, "/");

        if (
          data &&
          data.image_url === expectedImageUrl &&
          data.thumbnail_url !== expectedThumbnailUrl
        ) {
          // Update the thumbnail URL in the YAML file
          data.thumbnail_url = expectedThumbnailUrl;
          data.modified_at = new Date().toISOString();
          const newYamlContent = formatYaml(data);
          fs.writeFileSync(yamlPath, newYamlContent, "utf8");
          Logger.info(
            `Updated thumbnail URL in ${yamlPath} to ${expectedThumbnailUrl}`,
          );
          return;
        }
      } catch {
        // Skip invalid YAML files
        Logger.warning(`Failed to parse YAML file ${yamlPath}, skipping...`);
        continue;
      }
    }

    return;
  } catch {
    return;
  }
}

export async function regenthumb(args: string[]) {
  var thumbnailsToRegenerate: string[] = [];
  const startTime = Date.now();
  buildThumbnailMetadata();
  // Get all art pieces in public/art/characters and public/art/general (or the slug specified in args) and add them to thumbnailsToRegenerate
  // Then regenerate the thumbnail for each piece of art that doesn't exist (or if --force is specified)
  const artDirs = ["characters", "general"];
  for (const artDir of artDirs) {
    const dirPath = path.join("public", "art", artDir);
    if (!fs.existsSync(dirPath)) {
      Logger.warning(`Directory ${dirPath} does not exist, skipping...`);
      continue;
    }
    const files = fs.readdirSync(dirPath);
    for (const file of files) {
      const fullPath = path.join(dirPath, file);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        // Skip thumbnails directory; recurse into character subdirectories
        if (file === "thumbnails") {
          continue;
        }
        const subFiles = fs.readdirSync(fullPath);
        for (const subFile of subFiles) {
          const subFullPath = path.join(fullPath, subFile);
          const subStat = fs.statSync(subFullPath);
          if (
            !subStat.isDirectory() &&
            extensions.includes(path.extname(subFile).toLowerCase())
          ) {
            const slug = path.parse(subFile).name;
            if (args.length === 0 || args.includes(slug)) {
              thumbnailsToRegenerate.push(subFullPath);
            }
          }
        }
      } else if (extensions.includes(path.extname(file).toLowerCase())) {
        const slug = path.parse(file).name;
        if (args.length === 0 || args.includes(slug)) {
          thumbnailsToRegenerate.push(fullPath);
        }
      }
    }
  }

  let regenerated = [];
  let skipped = 0;
  let failed = 0;
  for (const imagePath of thumbnailsToRegenerate) {
    const thumbnailPath = path.join(
      path.dirname(imagePath),
      "thumbnails",
      path.parse(imagePath).name + ".webp",
    );
    if (!fs.existsSync(thumbnailPath) || context.force) {
      if (context.dryRun) {
        Logger.info(
          `Would regenerate thumbnail for ${Logger.fmtBold(imagePath)} to ${Logger.fmtBold(thumbnailPath)}`,
        );
        regenerated.push(imagePath);
        continue;
      }
      try {
        const imageKey = path.parse(imagePath).name;
        const thumbnailMetadata = thumbnailDataMap.get(imageKey);
        await generateThumbnail(
          imagePath,
          thumbnailPath,
          thumbnailMetadata?.thumbnail_anchor,
        );
        await updateContentFile(imagePath, thumbnailPath);
        Logger.success(
          `Generated thumbnail for ${Logger.fmtBold(imagePath)} to ${Logger.fmtBold(path.basename(thumbnailPath))}`,
        );
        regenerated.push(imagePath);
      } catch (error) {
        Logger.error(
          `Failed to generate thumbnail for ${Logger.fmtBold(imagePath)}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
        failed++;
      }
    } else {
      Logger.dim(
        `Thumbnail already exists for ${Logger.fmtBold(imagePath)}, skipping...`,
      );
      skipped++;
    }
  }
  const endTime = Date.now();
  const duration = endTime - startTime;
  if (context.noLog && !context.shouldExit) {
    Logger.noLogBypass(() =>
      Logger.statement(
        `${Logger.fmtReverse(Logger.fmtBold(" ARTCLI ")) + Logger.fmtHexBg("#744780", `${Logger.fmtHex("#000000", " regenthumb ")}`)} Regenerated ${regenerated.length} thumbnail${regenerated.length !== 1 ? "s" : ""} in ${Math.round(duration)}ms. ${Logger.fmtDim(`(skipped ${skipped}, failed ${failed})`)}`,
      ),
    );
  } else {
    Logger.statement(
      `Regenerated ${regenerated.length} thumbnail${regenerated.length !== 1 ? "s" : ""} in ${Math.round(duration)}ms. ${Logger.fmtDim(`(skipped ${skipped}, failed ${failed})`)}`,
    );
  }

  if (context.shouldCommit) {
    const pushMessage =
      regenerated.length > 1
        ? `Regenerate ${regenerated.length} thumbnails`
        : `Regenerate thumbnail for "${path.basename(thumbnailsToRegenerate[0] ?? "an art piece")}"`;
    await pushToRemote(regenerated, pushMessage);
  }

  exit(0);
}
