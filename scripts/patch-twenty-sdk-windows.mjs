// twenty-sdk 2.45.0 builds manifest/upload paths with path.relative(), which yields backslashes
// on Windows; the server rejects them ("Resource path must not contain backslashes").
// Idempotent postinstall patch: wrap those path.relative() results with replaceAll("\\", "/").
// Remove once an SDK release fixes it (re-test with `yarn twenty apply` on Windows).
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

if (process.platform !== 'win32') process.exit(0);

const dist = join(process.cwd(), 'node_modules', 'twenty-sdk', 'dist');
if (!existsSync(dist)) process.exit(0);

const FIX = '.replaceAll("\\\\", "/")';
const rules = [
  // upload filePath, ESM and CJS builds
  [/We\(k, e\)(?!\.replaceAll)/g, `We(k, e)${FIX}`],
  [/\(0,i\.relative\)\(n\.h,e\)(?!\.replaceAll)/g, `(0,i.relative)(n.h,e)${FIX}`],
  // manifest paths, CJS build
  [/\(0,r\.relative\)\((n,e|a,n)\)(?!\.replaceAll)/g, (m) => `${m}${FIX}`],
  // manifest paths, ESM build: shadow the imported helper
  [
    /relative as it \}( from "path";)\n(?!const it = )/,
    (_m, tail) => `relative as itRaw }${tail}\nconst it = (a, b) => itRaw(a, b)${FIX};\n`,
  ],
];

let changed = 0;
for (const name of readdirSync(dist)) {
  if (!/\.(m?js)$/.test(name)) continue;
  const file = join(dist, name);
  let src = readFileSync(file, 'utf8');
  let out = src;
  for (const [re, rep] of rules) out = out.replace(re, rep);
  if (out !== src) {
    writeFileSync(file, out);
    changed++;
  }
}
console.log(`patch-twenty-sdk-windows: ${changed} file(s) patched`);
