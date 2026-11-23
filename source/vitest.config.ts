import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config.ts';

// Keep validation from consuming every core on a laptop running the game.
export default mergeConfig(viteConfig, defineConfig({
  test: { maxWorkers: 1, testTimeout: 15000, hookTimeout: 15000 },
}));
