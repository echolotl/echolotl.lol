import * as fs from "node:fs";
import * as path from "node:path";
import { z } from "@nuxt/content";
import { load } from "js-yaml";
import { Logger } from "../../logger";
import { exit } from "../utils/cli";
import { context } from "../utils/context";
import {
  formatYaml,
  getAllArtFiles,
  getAllCharacterFiles,
  isActualCharacter,
} from "../utils/art";
import { pushToRemote } from "../utils/git";

function imageExists(imageUrl: unknown): boolean {
  if (typeof imageUrl !== "string" || !imageUrl.startsWith("/")) return false;
  try {
    return fs.existsSync(
      path.join(process.cwd(), "public", decodeURIComponent(imageUrl)),
    );
  } catch {
    return false;
  }
}

const dateTime = z.preprocess(
  (value) =>
    value instanceof Date
      ? value.toISOString()
      : typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
        ? `${value}T00:00:00.000Z`
        : value,
  z.string().datetime(),
);

const imageUrl = z.string().refine(imageExists, {
  message: "must point to an existing public image",
});

const imageVariant = z.object({
  image_url: imageUrl,
  thumbnail_url: imageUrl.optional(),
  thumbnail_anchor: z
    .enum([
      "top-left",
      "top",
      "top-right",
      "left",
      "center",
      "right",
      "bottom-left",
      "bottom",
      "bottom-right",
    ])
    .optional(),
  label: z.string().optional(),
  alt: z.string().optional(),
});

const artSchema = z.object({
  slug: z.string().min(1),
  created_at: dateTime,
  modified_at: dateTime,
  character: z.string().optional(),
  related_characters: z.array(z.string()).optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  pinned: z.boolean().default(false),
  artist: z
    .object({ name: z.string(), link: z.string().url().optional() })
    .optional(),
  nsfw: z.boolean().default(false),
  images: z
    .array(
      imageVariant.extend({
        id: z.string().optional(),
        title: z.string().optional(),
        variants: z.array(imageVariant).optional(),
      }),
    )
    .min(1),
  sketch: z.boolean().optional(),
});

const relationship = z.object({ slug: z.string(), name: z.string() });

const relationships = z.preprocess(
  (value) =>
    Array.isArray(value)
      ? value.filter(
          (relationship) =>
            typeof relationship === "object" &&
            relationship !== null &&
            "slug" in relationship &&
            typeof relationship.slug === "string" &&
            isActualCharacter(relationship.slug),
        )
      : value,
  z.array(relationship),
);

const characterSchema = z.preprocess(
  (value) => {
    if (!value || typeof value !== "object" || Array.isArray(value))
      return value;
    const data = value as Record<string, unknown>;
    return {
      ...data,
      created_at: data.created_at ?? data.created_date,
      modified_at: data.modified_at ?? data.last_modified ?? data.modified_date,
    };
  },
  z.object({
    slug: z.string().min(1),
    name: z.string().min(1),
    species: z.string().min(1),
    age: z.number().optional(),
    height: z.string().min(1),
    created_at: dateTime,
    modified_at: dateTime,
    pronouns: z.string().min(1),
    ipa: z.string().optional(),
    friends: relationships.optional(),
    likes: z.array(z.string()).optional(),
    dislikes: z.array(z.string()).optional(),
    enemies: relationships.optional(),
    category: z.string().optional(),
    short_description: z.string().optional(),
    theme_color: z.string().startsWith("#").length(7),
    theme_color_light: z.string().startsWith("#").length(7).optional(),
    color_palette: z.array(z.string().startsWith("#").length(7)).optional(),
    image: z
      .object({
        type: z.enum(["artwork", "url"]),
        url: z.string().optional(),
        slug: z.string().optional(),
      })
      .optional(),
    image_description: z.string().optional(),
    sitemap: z.unknown().optional(),
  }),
);

function formatErrors(error: {
  issues: { path: PropertyKey[]; message: string }[];
}): string[] {
  return error.issues.map(
    (issue) => `${issue.path.join(".") || "root"}: ${issue.message}`,
  );
}

function writeFile(filePath: string, content: string): boolean {
  const previousContent = fs.readFileSync(filePath, "utf8");
  if (previousContent === content) return false;
  if (context.dryRun) {
    Logger.warning(`[DRYRUN] Would update ${Logger.fmtBold(filePath)}`);
  } else {
    fs.writeFileSync(filePath, content, "utf8");
    Logger.success(`Updated ${Logger.fmtBold(filePath)}`);
  }
  return true;
}

function fixArtFile(filePath: string): { changed: boolean; errors: string[] } {
  const data = load(fs.readFileSync(filePath, "utf8"));
  const result = artSchema.safeParse(data);
  if (!result.success)
    return { changed: false, errors: formatErrors(result.error) };
  return {
    changed: writeFile(filePath, formatYaml(result.data)),
    errors: [],
  };
}

function fixCharacterFile(filePath: string): {
  changed: boolean;
  errors: string[];
} {
  const content = fs.readFileSync(filePath, "utf8");
  const frontmatter = content.match(
    /^(---\r?\n)([\s\S]*?)(\r?\n---(?:\r?\n|$))/,
  );
  if (!frontmatter || frontmatter.index === undefined) {
    return { changed: false, errors: ["Missing YAML frontmatter."] };
  }
  const data = load(frontmatter[2]!);
  const result = characterSchema.safeParse(data);
  if (!result.success)
    return { changed: false, errors: formatErrors(result.error) };
  const formattedContent =
    content.slice(0, frontmatter.index) +
    `${frontmatter[1]}${formatYaml(result.data)}---\n` +
    content.slice(frontmatter.index + frontmatter[0].length);
  return {
    changed: writeFile(filePath, formattedContent),
    errors: [],
  };
}

/** Fixes formatting and validates integrity of art and character metadata. */
export async function fixdata(): Promise<void> {
  let changed = 0;
  let invalid = 0;
  const changedFiles: string[] = [];
  const files = [
    ...getAllArtFiles().map((filePath) => ({ filePath, fix: fixArtFile })),
    ...getAllCharacterFiles().map((filePath) => ({
      filePath,
      fix: fixCharacterFile,
    })),
  ];

  for (const { filePath, fix } of files) {
    try {
      const result = fix(filePath);
      if (result.changed) {
        changed++;
        changedFiles.push(filePath);
      }
      for (const error of result.errors) {
        Logger.error(`${filePath}: ${error}`);
        invalid++;
      }
    } catch (error) {
      Logger.error(
        `${filePath}: ${error instanceof Error ? error.message : String(error)}`,
      );
      invalid++;
    }
  }

  const action = context.dryRun ? "Would format" : "Formatted";
  const summary = `${action} ${changed} file${changed === 1 ? "" : "s"}; found ${invalid} validation error${invalid === 1 ? "" : "s"}.`;
  if (context.noLog && !context.shouldExit) {
    Logger.noLogBypass(() =>
      Logger.statement(
        `${Logger.fmtReverse(Logger.fmtBold(" ARTCLI ")) + Logger.fmtHexBg("#744780", `${Logger.fmtHex("#000000", " fixdata ")}`)} ${summary}`,
      ),
    );
  } else {
    Logger.statement(summary);
  }
  if (invalid === 0 && context.shouldCommit && changedFiles.length > 0) {
    await pushToRemote(
      changedFiles,
      `Fixed ${changed} metadata file${changed === 1 ? "" : "s"}`,
    );
  }
  exit(invalid > 0 ? 1 : 0);
}
