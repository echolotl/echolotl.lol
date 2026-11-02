// Commits changes as Nautilus, either with a custom message or a preset one
import * as fs from "node:fs";
import * as path from "node:path";
import * as yaml from "js-yaml";
import { Logger } from "../../logger";
import { ART_DIR, CONTENT_DIR, context } from "../utils/context";
import { exit } from "../utils/cli";
import { hasStagedChanges, pushCurrentBranch, runGit } from "../utils/git";

type Action = "Upload" | "Update" | "Delete";

const TRACKED_DIRS = [CONTENT_DIR, ART_DIR];

function getArtTitle(file: string): string {
  const slug = path.basename(file, ".yml");
  try {
    const data = yaml.load(fs.readFileSync(file, "utf-8")) as {
      title?: string;
    } | null;
    return data?.title || slug;
  } catch {
    return slug;
  }
}

/**
 * Builds a commit message from the pending art metadata changes.
 */
function buildPresetMessage(): string {
  const status = runGit([
    "-c",
    "core.quotepath=false",
    "status",
    "--porcelain",
    "-uall",
    "--",
    CONTENT_DIR,
  ]);

  const changes: { action: Action; file: string }[] = [];
  for (const line of status.stdout.split("\n")) {
    const code = line.slice(0, 2);
    const file = line.slice(3).trim();
    if (!file.endsWith(".yml")) continue;

    let action: Action = "Update";
    if (code.includes("A") || code.includes("?")) action = "Upload";
    else if (code.includes("D")) action = "Delete";
    changes.push({ action, file });
  }

  if (changes.length === 0) return "Update art assets";

  const [first] = changes;
  if (changes.length === 1 && first) {
    const title =
      first.action === "Delete"
        ? path.basename(first.file, ".yml")
        : getArtTitle(first.file);
    return `${first.action} "${title}"`;
  }

  const counts = new Map<Action, number>();
  for (const { action } of changes) {
    counts.set(action, (counts.get(action) ?? 0) + 1);
  }
  return [...counts]
    .map(([action, n]) => `${action} ${n} art piece${n === 1 ? "" : "s"}`)
    .join(", ");
}

/**
 * Stages, commits and (with --push) pushes whatever art changes are pending.
 * Safe to re-run after a failed commit or push: already-staged and already-committed work is picked up.
 */
export async function nautilus(args: string[]) {
  const [command, ...rest] = args;

  let message: string;
  switch (command) {
    case "preset":
      message = buildPresetMessage();
      break;
    case "message":
      message = rest.join(" ").trim();
      if (!message) {
        Logger.error('Usage: nautilus message "<commit message>"');
        exit(1);
        return;
      }
      break;
    default:
      Logger.error(
        `Unknown command: ${command ?? "(none)"}. Use "preset" or "message <text>".`,
      );
      exit(1);
      return;
  }

  if (context.dryRun) {
    Logger.warning(
      `[DRYRUN] Would stage ${TRACKED_DIRS.join(", ")}, commit${context.shouldPush ? " and push" : ""} with message: "${message}"`,
    );
    exit(0);
    return;
  }

  // Directories are staged as a whole so gitignored files (thumbnails) are skipped instead of failing the add.
  Logger.info("Staging changes...");
  const addResult = runGit(["add", "--", ...TRACKED_DIRS]);
  if (!addResult.success) {
    Logger.error(`git add failed:\n${addResult.output}`);
    exit(1);
    return;
  }

  if (hasStagedChanges()) {
    const commitResult = runGit(["commit", "-m", message]);
    if (!commitResult.success) {
      Logger.error(`git commit failed:\n${commitResult.output}`);
      exit(1);
      return;
    }
    Logger.success(`Committed: ${Logger.fmtBold(message)}`);
  } else {
    Logger.info("Nothing new to commit.");
  }

  if (context.shouldPush) pushCurrentBranch();
  exit(0);
}
