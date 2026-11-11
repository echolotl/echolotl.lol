import { Logger } from "../../logger";
import { createInterface } from "node:readline/promises";
import { context } from "./context";

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
});

type UsageEntry = { command: string; description: string };

const usages: Record<"commands" | "flags", UsageEntry[]> = {
  commands: [
    {
      command: "add <image-paths...>",
      description:
        "Adds a new piece of art with the specified image through an interactive questionnaire.",
    },
    {
      command: "append <art-slug> <image-paths...>",
      description: "Appends images to an existing piece of art.",
    },
    {
      command: "update <art-slug>",
      description:
        "Updates metadata for an existing piece of art through an interactive questionnaire.",
    },
    {
      command: "remove <art-slug>",
      description:
        "Interactively selects an image to remove from an existing piece of art.",
    },
    {
      command: "delete <art-slug>",
      description:
        "Deletes an existing piece of art and all associated images after confirmation.",
    },
    {
      command: "list",
      description: "Lists all existing art with their slugs and titles.",
    },
    {
      command: "show <art-slug>",
      description: "Displays all metadata for a piece of art in the console.",
    },
    {
      command: "regenthumb <art-slug?>",
      description:
        "Regenerates thumbnails for all images, or just for a specific piece of art if a slug is provided.",
    },
    {
      command: "regenpalette <character-slug?>",
      description:
        "Regenerates palette images for all characters, or just for a specific character if a slug is provided.",
    },
    {
      command: "regenipa <character-slug?>",
      description:
        "Regenerates the text to speech audio files for all characters, or just for a specific character if a slug is provided. Remember to set the ARTCLI_11LABS_API_KEY environment variable if you want to use the funny voice!",
    },
    {
      command: "fixdata",
      description: "Formats and validates all art and character metadata.",
    },
    {
      command: "nautilus <preset|message <text...>>",
      description:
        "Stages pending art changes and commits them as Nautilus, using an auto-generated message (preset) or a custom one. Re-run with --push to retry a failed commit or push.",
    },
  ],
  flags: [
    {
      command: "--dry-run",
      description: "Run without writing any files or making any changes.",
    },
    {
      command: "--push",
      description: "Pushes the changes to the remote repository.",
    },
    {
      command: "--commit",
      description:
        "Commits the changes without pushing to the remote repository.",
    },
    {
      command: "--force",
      description:
        "Overwrite existing generated files or skip confirmation prompts where supported.",
    },
    {
      command: "--no-log",
      description:
        "Suppresses all log output except for final success or error messages.",
    },
    {
      command: "--help",
      description: "Displays this help message.",
    },
  ],
};

export function printUsage(error?: string): void {
  function section(title: string) {
    Logger.log(Logger.fmtBold(Logger.fmtHex("#da39a4", title.toUpperCase())));
  }

  function wrapText(text: string, maxLength: number): string[] {
    if (text.length <= maxLength) {
      return [text];
    }

    const words = text.split(/\s+/);
    const lines: string[] = [];
    let currentLine = "";

    for (const word of words) {
      const nextLine = currentLine ? `${currentLine} ${word}` : word;
      if (nextLine.length <= maxLength) {
        currentLine = nextLine;
      } else {
        if (currentLine) {
          lines.push(currentLine);
        }

        if (word.length > maxLength) {
          let remaining = word;
          while (remaining.length > maxLength) {
            lines.push(remaining.slice(0, maxLength));
            remaining = remaining.slice(maxLength);
          }
          currentLine = remaining;
        } else {
          currentLine = word;
        }
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines;
  }

  function printEntries(entries: UsageEntry[], inline = false) {
    const maxCommandLength = Math.max(
      ...entries.map((entry) => entry.command.length),
    );
    const descriptionPrefix = `${" ".repeat(maxCommandLength)}  `;

    for (const entry of entries) {
      if (inline) {
        const paddedCommand = entry.command.padEnd(maxCommandLength);
        const wrappedDescription = wrapText(
          entry.description,
          process.stdout.columns - maxCommandLength - 2,
        );
        Logger.dim(
          `${Logger.fmtBold(paddedCommand)}  ${wrappedDescription[0] ?? ""}`,
        );

        for (const line of wrappedDescription.slice(1)) {
          Logger.dim(`${descriptionPrefix}${line}`);
        }
      } else {
        Logger.statement(entry.command);
        Logger.dim(entry.description);
      }
    }
  }

  if (error) {
    Logger.error(error);
    Logger.nl();
  } else {
    Logger.log(
      Logger.fmtBold(
        Logger.fmtUnderline(
          Logger.fmtGradient(
            `echolotl's art CLI HELP :3`,
            "#b67eff",
            "#da39a4",
          ),
        ),
      ),
    );
    Logger.nl();
  }

  section("COMMANDS");
  printEntries(usages.commands, true);

  Logger.nl();
  section("FLAGS");
  printEntries(usages.flags, true);
}

export interface AskOptions {
  prompt?: string;
  default?: string;
  required?: boolean;
  validate?: (value: string) => string | true;
}

export async function ask(options: AskOptions = {}): Promise<string> {
  const {
    prompt = "▌ ",
    default: defaultValue,
    required = false,
    validate,
  } = options;
  const getAnswer = async (): Promise<string> => {
    try {
      return await rl.question(`\x1b[2m${prompt}\x1b[0m`);
    } catch (error) {
      Logger.nl();
      Logger.error(String(error));
      exit(1);
      throw error;
    }
  };

  let answer = await getAnswer();

  while (true) {
    if (required && !answer) {
      process.stdout.write("\x1b[0m");
      Logger.error("This field is required!");
      answer = await getAnswer();
      continue;
    }

    if (!answer && defaultValue !== undefined) {
      process.stdout.write(`\x1b[1A\r\x1b[2m${prompt}\x1b[0m${defaultValue}\n`);
      return defaultValue;
    }

    if (validate && answer) {
      const result = validate(answer);
      if (result !== true) {
        process.stdout.write("\x1b[0m");
        Logger.error(result);
        answer = await getAnswer();
        continue;
      }
    }

    break;
  }

  process.stdout.write("\x1b[0m");
  return answer;
}

export function exit(code: number = 0): void {
  rl.close();
  if (context.shouldExit) {
    process.exit(code);
  }
}
