import { context } from "./artcli/utils/context";

// Convert RGB to ANSI 256 color code
export function rgbToAnsi256(r: number, g: number, b: number): string {
  return `\x1b[38;2;${r};${g};${b}m`;
}

export function parseHexColor(hex: string): {
  r: number;
  g: number;
  b: number;
} {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
}

/**
 * Constructs a gradient string by interpolating between two hex colors across the characters of the input text.
 * @param text The text to apply the gradient to.
 * @param startColor The starting hex color of the gradient.
 * @param endColor The ending hex color of the gradient.
 * @returns The text with the gradient applied using ANSI escape codes.
 */
export function gradientText(
  text: string,
  startColor: string,
  endColor: string,
): string {
  const c1 = parseHexColor(startColor);
  const c2 = parseHexColor(endColor);
  const length = text.length;
  let result = "";
  for (let i = 0; i < length; i++) {
    const ratio = length === 1 ? 0 : i / (length - 1);
    const r = Math.round(c1.r + (c2.r - c1.r) * ratio);
    const g = Math.round(c1.g + (c2.g - c1.g) * ratio);
    const b = Math.round(c1.b + (c2.b - c1.b) * ratio);
    result += `${rgbToAnsi256(r, g, b)}${text[i]}`;
  }
  return result + "\x1b[0m";
}

let LOG_PREFIX = "▎ ";

// Stylized logger
export class Logger {
  static statement(message: string) {
    if (context.noLog) return;
    console.log(`\x1b[0;95m${LOG_PREFIX}${message}\x1b[0m`);
  }
  static success(message: string) {
    if (context.noLog) return;
    console.log(`\x1b[1;92m${LOG_PREFIX}\x1b[0m${message}\x1b[0m`);
  }
  static error(message: string) {
    if (context.noLog) return;
    console.error(`\x1b[1;91m${LOG_PREFIX}${message}\x1b[0m`);
  }
  static info(message: string) {
    if (context.noLog) return;
    console.log(`\x1b[0;36m\x1b[1m${LOG_PREFIX}\x1b[0m${message}\x1b[0m`);
  }
  static warning(message: string) {
    if (context.noLog) return;
    console.warn(`\x1b[1;93m${LOG_PREFIX}${message}\x1b[0m`);
  }
  static log(message: string) {
    if (context.noLog) return;
    // This purposefully does not include the LOG_PREFIX
    console.log(message);
  }
  static question(message: string) {
    if (context.noLog) return;
    console.log(`\x1b[2m${message}\x1b[0m`);
  }
  static nl() {
    if (context.noLog) return;
    console.log("");
  }
  static dim(message: string) {
    if (context.noLog) return;
    console.log(`\x1b[0;30m${LOG_PREFIX}${message}\x1b[0m`);
  }
  static rgb(r: number, g: number, b: number, message: string) {
    if (context.noLog) return;
    console.log(`\x1b[38;2;${r};${g};${b}m${LOG_PREFIX}${message}\x1b[0m`);
  }
  static hex(color: string, message: string) {
    if (context.noLog) return;
    const c = parseHexColor(color);
    this.rgb(c.r, c.g, c.b, message);
  }
  static fmtBold(message: string) {
    return `\x1b[1m${message}\x1b[22m`;
  }
  static fmtDim(message: string) {
    return `\x1b[2m${message}\x1b[22m`;
  }
  static fmtUnderline(message: string) {
    return `\x1b[4m${message}\x1b[24m`;
  }
  static fmtRgb(r: number, g: number, b: number, message: string) {
    return `\x1b[38;2;${r};${g};${b}m${message}\x1b[39m`;
  }
  static fmtHex(color: string, message: string) {
    const c = parseHexColor(color);
    return this.fmtRgb(c.r, c.g, c.b, message);
  }
  static fmtGradient(message: string, startColor: string, endColor: string) {
    return gradientText(message, startColor, endColor);
  }
  static fmtRgbBg(r: number, g: number, b: number, message: string) {
    return `\x1b[48;2;${r};${g};${b}m${message}\x1b[49m`;
  }
  static fmtHexBg(color: string, message: string) {
    const c = parseHexColor(color);
    return this.fmtRgbBg(c.r, c.g, c.b, message);
  }
  // Changes the current text color to the background color and vice versa, creating a "reverse" effect.
  static fmtReverse(message: string) {
    return `\x1b[7m${message}\x1b[27m`;
  }
  static noLogBypass<T>(fn: () => T): T {
    const originalNoLog = context.noLog;
    context.noLog = false;
    try {
      return fn();
    } finally {
      context.noLog = originalNoLog;
    }
  }
}
