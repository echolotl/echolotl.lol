import { Logger } from "../../logger";
import { exit, ask } from "../utils/cli";
import { getArtBySlug } from "../utils/art";
import type { Art } from "../../../types";
import { rmSync } from "node:fs";
import { CONTENT_DIR } from "../utils/context";
import path from "node:path";
import { context } from "../utils/context";
import { pushToRemote } from "../utils/git";
import { generateArtMetadataDisplay } from "./show";

/**
 * Deletes one or more art pieces by slug.
 * @param args The slug(s) of the art piece(s) to delete
 */
export async function del(args: string[]) {
  if (args.length === 0) {
    Logger.error("Please provide the slug(s) of the art to delete.");
    exit(1);
  }
  const artsToDelete: Art[] = [];
  for (const slug of args) {
    const art = getArtBySlug(slug);
    if (art) {
      artsToDelete.push(art);
    } else {
      Logger.warning(`Art with slug "${slug}" not found.`);
    }
  }
  if (artsToDelete.length === 0) {
    Logger.error("No valid art found to delete.");
    exit(1);
  }

  const deletedFiles: string[] = [];

  Logger.rgb(
    255,
    0,
    0,
    `${Logger.fmtBold("WARNING:")} You are about to delete the following art pieces:`,
  );
  Logger.nl();
  for (const art of artsToDelete) {
    generateArtMetadataDisplay(art);
  }
  Logger.nl();
  Logger.rgb(
    255,
    0,
    0,
    context.force
      ? `This action is irreversible!!!${context.shouldPush ? " " : " (unless restored from Git)"}.`
      : `This action is irreversible!!!${context.shouldPush ? " " : " (unless restored from Git)"}. Type "${Logger.fmtBold("DELETE")}" to confirm or anything else to cancel.`,
  );
  const confirmation = context.force ? "DELETE" : await ask();
  if (context.force) {
    Logger.warning("--force specified; skipping delete confirmation.");
  }
  if (confirmation === "DELETE") {
    for (const art of artsToDelete) {
      try {
        const isCharacter = !!art.character;

        // Delete each image file, thumbnail, and variants
        for (const image of art.images) {
          const imageFilePath = path.join("public", image.image_url);
          deletedFiles.push(imageFilePath);
          if (context.dryRun) {
            Logger.warning(
              `[DRYRUN] Would delete image file: ${imageFilePath}`,
            );
          } else {
            rmSync(imageFilePath, { force: true });
          }

          if (image.thumbnail_url) {
            const thumbnailFilePath = path.join("public", image.thumbnail_url);
            deletedFiles.push(thumbnailFilePath);
            if (context.dryRun) {
              Logger.warning(
                `[DRYRUN] Would delete thumbnail file: ${thumbnailFilePath}`,
              );
            } else {
              rmSync(thumbnailFilePath, { force: true });
            }
          }
          if (image.variants) {
            for (const variant of image.variants) {
              const variantFilePath = path.join("public", variant.image_url);
              deletedFiles.push(variantFilePath);
              if (context.dryRun) {
                Logger.warning(
                  `[DRYRUN] Would delete variant image file: ${variantFilePath}`,
                );
              } else {
                rmSync(variantFilePath, { force: true });
              }
              if (variant.thumbnail_url) {
                const variantThumbnailFilePath = path.join(
                  "public",
                  variant.thumbnail_url,
                );
                deletedFiles.push(variantThumbnailFilePath);
                if (context.dryRun) {
                  Logger.warning(
                    `[DRYRUN] Would delete variant thumbnail file: ${variantThumbnailFilePath}`,
                  );
                } else {
                  rmSync(variantThumbnailFilePath, {
                    force: true,
                  });
                }
              }
            }
          }
        }

        const yamlPath = isCharacter
          ? path.join(
              CONTENT_DIR,
              "characters",
              art.character!,
              `${art.slug}.yml`,
            )
          : path.join(CONTENT_DIR, "general", `${art.slug}.yml`);
        deletedFiles.push(yamlPath);
        if (context.dryRun) {
          Logger.warning(`[DRYRUN] Would delete YAML file: ${yamlPath}`);
        } else {
          rmSync(yamlPath, { force: true });
        }
        Logger.success(`Deleted art: ${Logger.fmtBold(art.title || art.slug)}`);
      } catch (error) {
        Logger.error(
          `Failed to delete art "${art.title || art.slug}": ${error}`,
        );
      }
    }
    if (context.shouldCommit) {
      const pushMessage =
        artsToDelete.length > 1
          ? `Delete ${artsToDelete.length} art pieces`
          : `Delete "${artsToDelete[0]?.title || artsToDelete[0]?.slug || "an art piece"}"`;
      await pushToRemote(deletedFiles, pushMessage);
    }
  } else {
    Logger.error("Deletion cancelled.");
  }
  exit(0);
}
