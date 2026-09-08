import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const src = fileURLToPath(new URL("../src/", import.meta.url));
const css = readFileSync(join(src, "styles/tokens.css"), "utf8");
assert.match(css, /--font-sans: "Instrument Sans"/);
assert.doesNotMatch(css, /Lato|Helvetica|zoom\s*:/);
let titles = 0;
for (const file of readdirSync(join(src, "routes")).filter((name) => name.endsWith(".tsx"))) {
  const code = readFileSync(join(src, "routes", file), "utf8");
  assert.doesNotMatch(code, /Helvetica|Lato|yb-reference-scale/, file);
  for (const title of code.matchAll(/<h1\s+className="([^"]*)"/g)) {
    assert.match(title[1], /yb-page-title/, `${file}: use the shared page title`);
    titles++;
  }
}
for (const file of ["inbox.tsx", "whatsapp-groups.tsx"]) {
  assert.match(readFileSync(join(src, "routes", file), "utf8"), /<WhatsAppSubnav /);
}
const header = readFileSync(join(src, "components/AppShell/AppHeader.tsx"), "utf8");
assert.doesNotMatch(header, /Sign Out/);
assert.match(header, /<ProfileMenu \/>/);
const profile = readFileSync(join(src, "components/AppShell/ProfileMenu.tsx"), "utf8");
assert.equal([...profile.matchAll(/>Sign Out<\/span>/g)].length, 1);
assert.match(profile, /role="menuitem"/);
console.log(`Design consistency passed: ${titles} page titles, shared font, no route zoom overrides, shared WhatsApp navigation, one Sign Out.`);
