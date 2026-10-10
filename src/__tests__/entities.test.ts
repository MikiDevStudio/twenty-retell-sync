import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

// The SDK finds entities by parsing each file as plain TypeScript (not TSX) and looking for a top-level
// `export default define...(...)`. A JSX-heavy file makes that parse swallow the export, and the entity
// silently drops out of the build (the Retell tab vanished from a deployed server this way).
describe('front component entry files', () => {
  const dir = join(__dirname, '..', 'front-components');

  for (const file of readdirSync(dir).filter((name) => name.endsWith('.front-component.tsx'))) {
    it(`${file} keeps its default export visible to the SDK`, () => {
      const source = ts.createSourceFile('temp.ts', readFileSync(join(dir, file), 'utf8'), ts.ScriptTarget.Latest, true);
      expect(source.statements.some((node) => ts.isExportAssignment(node))).toBe(true);
    });
  }
});
