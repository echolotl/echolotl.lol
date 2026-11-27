export function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// This is terrible and uses the deprecated `document.execCommand`,
// but it's the best way to insert plain text into a contenteditable element
export function insertPlainText(text: string) {
  document.execCommand("insertText", false, text);
}
