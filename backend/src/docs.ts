import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { bundledLanguages, createHighlighter, type BundledLanguage } from "shiki";
import { z } from "zod";

const highlighter = createHighlighter({ themes: ["github-dark"], langs: [] });
const languages = new Map<string, Promise<void>>();

const sectionSchema = z.strictObject({
  title: z.string().min(1),
  id: z
    .string()
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  description: z.string().optional(),
});

const routeSchema = z.strictObject({
  method: z.enum(["GET", "POST", "PATCH", "DELETE"]),
  path: z.string().regex(/^\/(?!\/)\S*$/),
  summary: z.string().min(1),
  link: z.enum(["true", "false"]).optional(),
  auth: z.enum(["admin", "discord"]).optional(),
});

function escapeHtml(text: string): string {
  return text.replace(
    /[&<>"']/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[char]!,
  );
}

async function markdown(text: string): Promise<string> {
  const options = { noHtmlBlocks: true, noHtmlSpans: true };
  const blocks: { code: string; language: string }[] = [];
  Bun.markdown.render(text, {
    code(code, meta) {
      blocks.push({ code, language: meta?.language || "text" });
      return "";
    },
  }, options);
  const html = Bun.markdown.html(text, options);
  if (!blocks.length) return html;
  const shiki = await highlighter;
  const highlighted = await Promise.all(blocks.map(async ({ code, language }) => {
    if (language !== "text" && language !== "plaintext") {
      if (!Object.prototype.hasOwnProperty.call(bundledLanguages, language)) {
        throw new Error(`Unknown code block language: ${language}`);
      }
      let loading = languages.get(language);
      if (!loading) {
        loading = shiki.loadLanguage(bundledLanguages[language as BundledLanguage]);
        languages.set(language, loading);
      }
      await loading;
    }
    return shiki.codeToHtml(code, { lang: language, theme: "github-dark" });
  }));
  let index = 0;
  const result = html.replace(/<pre><code(?: class="language-[^"]*")?>[\s\S]*?<\/code><\/pre>/g, () => {
    const block = highlighted[index++];
    if (block === undefined) throw new Error("Markdown code block rendering mismatch");
    return block;
  });
  if (index !== highlighted.length) throw new Error("Markdown code block rendering mismatch");
  return result;
}

async function renderBody(body: string): Promise<string> {
  const parts: { title?: string; lines: string[] }[] = [{ lines: [] }];
  let fence: { char: string; length: number } | undefined;
  for (const line of body.split(/\r?\n/)) {
    const marker = line.match(/^ {0,3}(`{3,}|~{3,})/);
    if (marker) {
      const value = marker[1]!;
      if (!fence) fence = { char: value[0]!, length: value.length };
      else if (
        value[0] === fence.char &&
        value.length >= fence.length &&
        line.slice(marker[0].length).trim() === ""
      )
        fence = undefined;
    }
    const response = !fence && line.match(/^### (\d{3}(?:\s+.+)?)\s*$/);
    if (response) parts.push({ title: response[1], lines: [] });
    else parts[parts.length - 1]!.lines.push(line);
  }
  return (await Promise.all(parts
    .map(async ({ title, lines }) => {
      const content = (await markdown(lines.join("\n"))).replace(
        /<(\/?)h([24])>/g,
        (_, slash: string, level: string) =>
          `<${slash}h${level === "2" ? "4" : "5"}>`,
      );
      return title
        ? `<details><summary><b>${escapeHtml(title)}</b></summary><info>${content}</info></details>`
        : content;
    })))
    .join("\n");
}

async function renderRoute(source: string, filename: string): Promise<string> {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match)
    throw new Error(`${filename}: expected frontmatter between --- lines`);
  const metadata: Record<string, string> = {};
  for (const line of match[1]!.split(/\r?\n/)) {
    const field = line.match(/^([a-z]+):\s*(.*?)\s*$/);
    if (!field || field[1]! in metadata)
      throw new Error(`${filename}: invalid or duplicate metadata: ${line}`);
    metadata[field[1]!] = field[2]!;
  }
  const route = routeSchema.parse(metadata);
  const path = escapeHtml(route.path);
  const displayPath =
    route.link === "true" ? `<a href="${path}">${path}</a>` : path;
  const auth = route.auth
    ? `<span class="material-symbols-outlined auth ${route.auth}" role="img" aria-label="Requires ${route.auth} authentication">lock</span>`
    : "";
  return `<li><details class="route"><summary><div><code class="${route.method.toLowerCase()}">${route.method}</code> <code>${displayPath}</code> ${auth}<div class="description">${escapeHtml(route.summary)}</div></div></summary><info>${await renderBody(match[2]!)}</info></details></li>`;
}

export async function renderDocs(
  directory: string,
  template: string,
): Promise<string> {
  const sections = await readdir(directory, { withFileTypes: true });
  const output: string[] = [];
  for (const section of sections
    .filter((entry) => entry.isDirectory())
    .sort((a, b) => a.name.localeCompare(b.name))) {
    const sectionPath = join(directory, section.name);
    const config = sectionSchema.parse(
      JSON.parse(await readFile(join(sectionPath, "_section.json"), "utf8")),
    );
    const files = (await readdir(sectionPath))
      .filter((name) => name.endsWith(".md"))
      .sort();
    const routes = await Promise.all(
      files.map(async (name) =>
        renderRoute(
          await readFile(join(sectionPath, name), "utf8"),
          join(sectionPath, name),
        ),
      ),
    );
    output.push(
      `<h2${config.id ? ` id="${escapeHtml(config.id)}"` : ""}>${escapeHtml(config.title)}</h2>`,
    );
    if (config.description) output.push(await markdown(config.description));
    output.push(`<ul>${routes.join("\n")}</ul>`);
  }
  if (!template.includes("<!-- API_DOCS -->"))
    throw new Error("Docs template is missing <!-- API_DOCS -->");
  return template.replace("<!-- API_DOCS -->", () => output.join("\n"));
}
