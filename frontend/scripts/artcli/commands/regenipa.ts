import { Logger } from "../../logger";
import { exit } from "../utils/cli";
import { ipaToPhonemeText, saveAudioFileFromText } from "../utils/tts";
import { getAllCharacters } from "../utils/art";
import { type Character } from "../../../types";
import { existsSync, mkdirSync } from "fs";
import { join } from "path";
import { context } from "../utils/context";

const IPA_DIR = "public/sounds/pronunciations";

export async function regenIPA(args: string[]) {
  let generated = 0;
  let skipped = 0;
  let selected = 0;
  let characters: Character[] = [];

  if (!existsSync(IPA_DIR)) {
    mkdirSync(IPA_DIR, { recursive: true });
  }
  try {
    characters = getAllCharacters();
    for (const character of characters) {
      if (args.length === 0 || args.includes(character.slug)) {
        selected++;
        if (!character.ipa) {
          Logger.warning(`Skipping ${character.name}...`);
          skipped++;
          continue;
        }
        const outputPath = join(IPA_DIR, `${character.slug}.wav`);
        const exists = existsSync(outputPath);

        if (exists && !context.force) {
          Logger.dim(
            `Audio already exists for ${Logger.fmtBold(character.name)}, skipping...`,
          );
          skipped++;
          continue;
        }

        await saveAudioFileFromText(character.ipa, outputPath);
        generated++;
        Logger.success(
          `${exists ? "Regenerated" : "Generated"} ${Logger.fmtBold(Logger.fmtHex(character.theme_color, character.name))}'s pronunciation audio ${Logger.fmtDim("(" + outputPath + ")")} ${Logger.fmtDim("[" + ipaToPhonemeText(character.ipa) + "]")}`,
        );
      }
    }
  } catch (error) {
    Logger.error(
      `Error generating character pronunciations: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  if (context.noLog && !context.shouldExit) {
    Logger.noLogBypass(() =>
      Logger.statement(
        `${Logger.fmtReverse(Logger.fmtBold(" ARTCLI ")) + Logger.fmtHexBg("#744780", `${Logger.fmtHex("#000000", " regenipa ")}`)} Generated ${generated} pronunciations${generated !== 1 ? "s" : ""} for ${selected} character${selected !== 1 ? "s" : ""}. ${Logger.fmtDim(`(skipped ${skipped})`)}`,
      ),
    );
  }

  exit(0);
}
