import { Logger } from "../../logger";
import { exit } from "../utils/cli";
import { getArtBySlug } from "../utils/art";
import type { Art } from "../../../types";

export function generateArtMetadataDisplay(art: Art) {
  Logger.statement(
    `${Logger.fmtBold(art.title)} ${Logger.fmtDim("(" + art.slug + ") - " + art.description)}`,
  );
  Logger.dim(
    `${Logger.fmtBold("Created at")}: ${art.created_at} | ${Logger.fmtBold("Modified at")}: ${art.modified_at}`,
  );
  if (art.character) {
    Logger.dim(
      `${Logger.fmtBold("Character")}: ${art.character}${
        art.related_characters
          ? ` (Related: ${art.related_characters.join(", ")})`
          : ""
      }`,
    );
  }
  if (art.tags && art.tags.length > 0) {
    Logger.dim(`${Logger.fmtBold("Tags")}: ${art.tags.join(", ")}`);
  }
  Logger.dim(`${Logger.fmtBold("Artist")}: ${art.artist?.name || "echolotl"}`);
  Logger.dim(
    `${Logger.fmtBold("URL")}: ${Logger.fmtUnderline(Logger.fmtHex("#0033FF", `https://www.echolotl.lol/art/${art.slug}`))}`,
  );
  let attributes = [];
  if (art.pinned) attributes.push("📌 PINNED");
  if (art.sketch) attributes.push("✎ SKETCH");
  if (art.images.length > 1)
    attributes.push(
      `🎑 ${art.images.length} IMAGE${art.images.length > 1 ? "S" : ""}`,
    );
  if (attributes.length > 0) {
    Logger.dim(`${Logger.fmtBold(attributes.join(" | "))}`);
  }
}

export async function show(args: string[]) {
  if (args.length === 0) {
    Logger.error("Please provide the slug of the art to show.");
    exit(1);
  }

  for (const slug of args) {
    const art = getArtBySlug(slug);
    if (art) {
      generateArtMetadataDisplay(art);
    } else {
      Logger.warning(`Art with slug "${slug}" not found.`);
    }
  }

  exit(0);
}
