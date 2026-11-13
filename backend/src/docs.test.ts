import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { renderDocs } from "./docs";

const temporary: string[] = [];

afterEach(async () => {
  await Promise.all(temporary.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

describe("API docs", () => {
  test("renders existing routes and highlighted examples into the page", async () => {
    const template = await Bun.file("./src/assets/index.html").text();
    const html = await renderDocs("./docs", template);
    expect(html.match(/class="route"/g)).toHaveLength(20);
    expect(html).toContain('id="discord-auth"');
    expect(html).toContain("/picross/:date");
    expect(html).toContain("X-Picross-Now");
    expect(html).toContain("Trick to It");
    expect(html).toContain("Returns if no parent comment with that <code>id</code> exists.");
    expect(html).toContain("<summary><b>200 OK</b></summary>");
    expect(html).toContain('class="shiki github-dark"');
    expect(html).not.toContain("esm.sh/shiki");
    expect(html).not.toContain("<!-- API_DOCS -->");
  });

  test("reads edits, highlights code safely and rejects invalid input", async () => {
    const dir = await mkdtemp(join(tmpdir(), "api-docs-"));
    temporary.push(dir);
    const section = join(dir, "01-section");
    await mkdir(section);
    await writeFile(join(section, "_section.json"), JSON.stringify({ title: "Test" }));
    const path = join(section, "01-route.md");
    const source = "---\nmethod: GET\npath: /test\nsummary: Test & example\nlink: true\n---\n\n## Returns\n\n### 200 OK\n\n```text\n### 404 Not Found\n<script>alert(1)</script>\n```\n";
    await writeFile(path, source);
    const first = await renderDocs(dir, "<!-- API_DOCS -->");
    expect(first).toContain("Test &amp; example");
    expect(first).toContain('<a href="/test">/test</a>');
    expect(first).toContain("<h4>Returns</h4>");
    expect(first).toContain("### 404 Not Found");
    expect(first).not.toContain("<script>alert(1)</script>");
    expect(first).not.toContain("<summary><b>404 Not Found</b></summary>");
    await writeFile(path, source.replace("Test & example", "Updated"));
    expect(await renderDocs(dir, "<!-- API_DOCS -->")).toContain("Updated");
    await writeFile(path, source.replace("method: GET", "method: INVALID"));
    await expect(renderDocs(dir, "<!-- API_DOCS -->")).rejects.toThrow();
    await writeFile(path, source.replace("```text", "```not-a-language"));
    await expect(renderDocs(dir, "<!-- API_DOCS -->")).rejects.toThrow("Unknown code block language");
  });
});
