/**
 * Parses a comma-separated string into an array of trimmed, non-empty strings.
 * @param input comma-separated string to parse
 * @returns Array of trimmed, non-empty strings
 */
export function parseCommaSeparated(input: string): string[] {
  return input
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}
