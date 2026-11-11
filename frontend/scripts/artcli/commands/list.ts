import { Logger } from "../../logger";
import { exit } from "../utils/cli";
import { getAllArts, getCharacterBySlug } from "../utils/art";

/**
 * Lists all art pieces' slugs, grouped by character.
 */
export async function list() {
  function section(title: string, color: string = "#da39a4") {
    Logger.log(Logger.fmtBold(Logger.fmtHex(color, title.toUpperCase())));
  }
  const arts = getAllArts();
  const generalArts = arts.filter((art) => !art.character);
  const characterArts = arts.filter((art) => art.character);
  const characterColors: Record<string, string> = {};
  for (const art of characterArts) {
    if (art.character && !characterColors[art.character]) {
      characterColors[art.character] =
        getCharacterBySlug(art.character).theme_color || "#da39a4";
    }
  }
  section("General Art");
  Logger.dim(
    generalArts.length > 0
      ? generalArts.map((art) => art.slug).join(", ")
      : "No general art found.",
  );
  for (const character of Object.keys(characterColors)) {
    section(`${character}`, characterColors[character]);
    const artsForCharacter = characterArts.filter(
      (art) => art.character === character,
    );
    Logger.dim(
      artsForCharacter.length > 0
        ? artsForCharacter.map((art) => art.slug).join(", ")
        : "No art found for this character.",
    );
  }

  exit(0);
}
