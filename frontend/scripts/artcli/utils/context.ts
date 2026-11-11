export const ART_DIR = "public/art";
export const CONTENT_DIR = "content/art";

// Global state for the current execution context of the script.
export const context = {
  dryRun: false,
  shouldCommit: false,
  shouldPush: false,
  noLog: true, // This is mostly for scripts where you import a command directly.
  shouldExit: false, // ditto
  force: false,
};
