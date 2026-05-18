import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const dist = path.join(root, "dist");
const out = path.join(root, "netlify-inline");

await fs.rm(out, { recursive: true, force: true });
await fs.mkdir(out, { recursive: true });

let html = await fs.readFile(path.join(dist, "index.html"), "utf8");

const cssMatches = [...html.matchAll(/<link rel="stylesheet" crossorigin href="([^"]+)">/g)];
for (const match of cssMatches) {
  const assetPath = path.join(dist, match[1].replace(/^\//, ""));
  const css = await fs.readFile(assetPath, "utf8");
  html = html.replace(match[0], () => `<style>\n${css}\n</style>`);
}

const jsMatches = [...html.matchAll(/<script type="module" crossorigin src="([^"]+)"><\/script>/g)];
for (const match of jsMatches) {
  const assetPath = path.join(dist, match[1].replace(/^\//, ""));
  const js = (await fs.readFile(assetPath, "utf8")).replaceAll("</script", "<\\/script");
  html = html.replace(match[0], () => `<script type="module">\n${js}\n</script>`);
}

await fs.writeFile(path.join(out, "index.html"), html);

try {
  await fs.copyFile(path.join(dist, "service-worker.js"), path.join(out, "service-worker.js"));
} catch {
  // No service worker is fine for the inline deployment.
}

console.log(`Wrote ${path.join(out, "index.html")}`);
