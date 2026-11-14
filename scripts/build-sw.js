// Post-build step: stamps docs/sw.js with a content hash and the list of
// built files to precache, so the whole app is available offline.
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const outDir = path.resolve(__dirname, "../docs");
const swFile = path.join(outDir, "sw.js");
const SKIP = new Set(["sw.js", "CNAME", "robots.txt", "sitemap.xml"]);

if (!fs.existsSync(swFile)) {
  console.error("build-sw: docs/sw.js not found — run the build first.");
  process.exit(1);
}

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

const hash = crypto.createHash("sha256");
const files = walk(outDir)
  .map((full) => path.relative(outDir, full).split(path.sep).join("/"))
  .filter((rel) => !SKIP.has(rel))
  .sort();

for (const rel of files) {
  hash.update(rel);
  hash.update(fs.readFileSync(path.join(outDir, rel)));
}

// Cache pages by their clean URL ("chat/") as well as their file path.
const precache = ["./"];
for (const rel of files) {
  precache.push(rel);
  if (rel.endsWith("/index.html")) precache.push(rel.slice(0, -"index.html".length));
}

const version = hash.digest("hex").slice(0, 12);
let sw = fs.readFileSync(swFile, "utf8");
sw = sw
  .replace(/const VERSION = "dev";/, `const VERSION = ${JSON.stringify(version)};`)
  .replace(/const PRECACHE = \[\];/, `const PRECACHE = ${JSON.stringify(precache)};`);
fs.writeFileSync(swFile, sw);

console.log(`build-sw: precached ${precache.length} URLs (version ${version})`);
