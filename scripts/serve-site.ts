// Serves the static site in out/ the way GitHub Pages does, to check a
// `pnpm site:build` before it is deployed:
//
//   pnpm site:serve [port]    then open http://localhost:4173/newslingo/
//
// A folder is answered with its index.html, a folder without the trailing
// slash is redirected to it, and anything else missing gets 404.html.
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";

const BASE_PATH = "/newslingo";
const ROOT = join(process.cwd(), "out");
const port = Number(process.argv[2] ?? 4173);

const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".ico": "image/x-icon",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".xml": "application/xml; charset=utf-8",
};

async function isFile(path: string) {
  return (await stat(path).catch(() => null))?.isFile() ?? false;
}

createServer(async (request, response) => {
  const { pathname } = new URL(request.url ?? "/", "http://localhost");
  const relative = pathname.startsWith(`${BASE_PATH}/`)
    ? decodeURIComponent(pathname.slice(BASE_PATH.length))
    : null;
  // normalize() resolves "..", so a request cannot leave out/.
  const path = relative === null ? null : join(ROOT, normalize(relative));

  if (path && !path.endsWith("/") && (await isFile(join(path, "index.html")))) {
    response.writeHead(301, { location: `${pathname}/` });
    response.end();
    return;
  }

  const file =
    path &&
    path.startsWith(ROOT) &&
    ((await isFile(path)) ? path : join(path, "index.html"));
  const found = file && (await isFile(file));
  const served = found ? file : join(ROOT, "404.html");

  response.writeHead(found ? 200 : 404, {
    "content-type": TYPES[extname(served)] ?? "application/octet-stream",
  });
  createReadStream(served).pipe(response);
}).listen(port, () => {
  console.log(`Serving out/ at http://localhost:${port}${BASE_PATH}/`);
});
