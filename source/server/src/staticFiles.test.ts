import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { resolvePublicFile } from './staticFiles.js';

describe('Public build isolation', () => {
  const root = resolve('dist');
  it('serves only files under the public build root', () => {
    expect(resolvePublicFile(root, '/')).toBe(resolve(root, 'index.html'));
    expect(resolvePublicFile(root, '/assets/game.js?v=1')).toBe(resolve(root, 'assets/game.js'));
  });
  it.each(['/../package.json', '/%2e%2e/package.json', '/.env', '/assets/../../server.ts', '/%00', '/%zz', '/..%5cpackage.json'])(
    'blocks %s', (url) => expect(resolvePublicFile(root, url)).toBeNull(),
  );
});
