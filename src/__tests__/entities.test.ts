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

// The SDK only sees a top-level `export default define...(...)`. These entities silently drop out of the
// build if that export is hidden, so check every entry file the same way the front components are checked.
describe('page layout and navigation entry files', () => {
  for (const folder of ['page-layouts', 'navigation-menu-items', 'page-layout-tabs']) {
    const dir = join(__dirname, '..', folder);
    for (const file of readdirSync(dir).filter((name) => name.endsWith('.ts'))) {
      it(`${folder}/${file} keeps its default export visible to the SDK`, () => {
        const source = ts.createSourceFile('temp.ts', readFileSync(join(dir, file), 'utf8'), ts.ScriptTarget.Latest, true);
        expect(source.statements.some((node) => ts.isExportAssignment(node))).toBe(true);
      });
    }
  }
});

describe('universal identifiers', () => {
  it('are all UUID v4', () => {
    const text = readFileSync(join(__dirname, '..', 'constants', 'universal-identifiers.ts'), 'utf8');
    const ids = text.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi) ?? [];
    expect(ids.length).toBeGreaterThan(50);
    for (const id of ids) expect(id, id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });
});
