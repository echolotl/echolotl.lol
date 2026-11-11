import { Logger } from "../../logger";
import { exit } from "../utils/cli";
import { type Character } from "../../../types";
import { existsSync, mkdirSync } from "fs";
import { join } from "path";
import { getAllCharacters } from "../utils/art";
import sharp from "sharp";
import { context } from "../utils/context";

const PALETTES_DIR = "public/images/palettes";
const SWATCH_SIZE = 16;

export async function regenpalette(args: string[]) {
  let generated = 0;
  let skipped = 0;
  let selected = 0;
  let characters: Character[] = [];
  if (!existsSync(PALETTES_DIR)) {
    mkdirSync(PALETTES_DIR, { recursive: true });
  }
  try {
    characters = getAllCharacters();
    for (const character of characters) {
      if (args.length === 0 || args.includes(character.slug)) {
        selected++;
        if (!character.color_palette || character.color_palette.length === 0) {
          Logger.warning(`Skipping ${character.name}...`);
          skipped++;
          continue;
        }
        const outputPath = join(PALETTES_DIR, `${character.slug}.png`);
        const paletteExists = existsSync(outputPath);

        if (paletteExists && !context.force) {
          Logger.dim(
            `Palette already exists for ${Logger.fmtBold(character.name)}, skipping...`,
          );
          skipped++;
          continue;
        }

        // Generate palette image
        const totalWidth = SWATCH_SIZE * character.color_palette.length;

        // Create an SVG because node
        const svg = `<svg width="${totalWidth}" height="${SWATCH_SIZE}">
                    ${character.color_palette
                      .map(
                        (color, index) => `
                        <rect x="${index * SWATCH_SIZE}" y="0" width="${SWATCH_SIZE}" height="${SWATCH_SIZE}" fill="${color}" />`,
                      )
                      .join("")}
                     </svg>`;

        await sharp(Buffer.from(svg)).png().toFile(outputPath);
        generated++;
        Logger.success(
          `${paletteExists ? "Regenerated" : "Generated"} ${Logger.fmtBold(Logger.fmtHex(character.theme_color, character.name))}'s palette ${Logger.fmtDim("(" + outputPath + ")")} ${character.color_palette
            .map((color) => Logger.fmtHex(color, "██"))
            .join("")}`,
        );
      }
    }
  } catch (error) {
    Logger.error(
      `Error generating palettes: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  if (context.noLog && !context.shouldExit) {
    Logger.noLogBypass(() =>
      Logger.statement(
        `${Logger.fmtReverse(Logger.fmtBold(" ARTCLI ")) + Logger.fmtHexBg("#744780", `${Logger.fmtHex("#000000", " regenpalette ")}`)} Generated ${generated} palette${generated !== 1 ? "s" : ""} for ${selected} character${selected !== 1 ? "s" : ""}. ${Logger.fmtDim(`(skipped ${skipped})`)}`,
      ),
    );
  }

  exit(0);
}
