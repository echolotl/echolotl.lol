// ECHOLOTL ARTCLI
// The command-line tool used to manage art assets and metadata for echolotl.lol

import "dotenv/config";
import { Logger } from "../logger";
import { context } from "./utils/context";
import { printUsage, exit } from "./utils/cli";
import { add } from "./commands/add";
import { append } from "./commands/append";
import { update } from "./commands/update";
import { remove } from "./commands/remove";
import { del } from "./commands/delete";
import { list } from "./commands/list";
import { show } from "./commands/show";
import { regenthumb } from "./commands/regenthumb";
import { regenpalette } from "./commands/regenpalette";
import { fixdata } from "./commands/fix-data";
import { regenIPA } from "./commands/regenipa";
import { nautilus } from "./commands/nautilus";

function resetContext() {
  context.dryRun = false;
  context.shouldCommit = false;
  context.shouldPush = false;
  context.noLog = false;
  context.force = false;
}

export async function runArtCLI(rawArgs: string[]) {
  resetContext();
  const argv = rawArgs.filter((arg) => {
    if (arg === "--dry-run") {
      context.dryRun = true;
      return false;
    }
    if (arg === "--push") {
      context.shouldCommit = true;
      context.shouldPush = true;
      return false;
    }
    if (arg === "--commit") {
      context.shouldCommit = true;
      return false;
    }
    if (arg === "--no-log") {
      context.noLog = true;
      return false;
    }
    if (arg === "--help" || arg === "-h") {
      printUsage();
      exit(0);
    }
    if (arg === "--force") {
      context.force = true;
      return false;
    }
    return true;
  });
  if (context.dryRun)
    Logger.warning("Running in dry-run mode. No files will be written.");
  const [command, ...args] = argv;
  switch (command) {
    case "add":
      await add(args);
      break;
    case "append":
      await append(args);
      break;
    case "update":
      await update(args);
      break;
    case "remove":
      await remove(args);
      break;
    case "delete":
      await del(args);
      break;
    case "list":
      await list();
      break;
    case "show":
      await show(args);
      break;
    case "regenthumb":
      await regenthumb(args);
      break;
    case "regenpalette":
      await regenpalette(args);
      break;
    case "regenipa":
      await regenIPA(args);
      break;
    case "fixdata":
      await fixdata();
      break;
    case "nautilus":
      await nautilus(args);
      break;
    default:
      printUsage();
      exit(0);
  }
}

async function main() {
  context.shouldExit = true;
  context.noLog = false;
  await runArtCLI(process.argv.slice(2));
}

if (import.meta.main) {
  void main();
}
