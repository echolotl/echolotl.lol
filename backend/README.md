# echolotl.lol backend

Built with [Elysia](https://elysiajs.com/)!

## Why?

Since echolotl.lol is a statically generated website hosted on Vercel, I can't have persistant storage or a dedicated server to handle things that need one.

## API documentation

The API page at `/` is rendered from the files in `docs/`. Each numbered
directory is a section, with a `_section.json` containing its `title` and
optional `id` and Markdown `description`. Section directories and endpoint
files appear in filename order.

Add a `.md` file to a section to document an endpoint. Its front matter contains
`method` (GET, POST, PATCH, or DELETE), `path`, and `summary`. Optionally add
`link: true` to make the path clickable and `auth: admin` or `auth: discord` to
show an authentication icon. Write the rest as Markdown; `### 200 OK` (or any
other three-digit status heading) creates a collapsible response. Fenced code
blocks are highlighted by Shiki on the server; use a supported Shiki language
name or omit the language for plain text. See
`docs/04-picross/01-get-picross-date.md` for an example. Changes are read on
the next page request; deploy the `docs/` directory alongside the backend.
