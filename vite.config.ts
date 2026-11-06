import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    sveltekit({
      compilerOptions: {
        // Force runes mode for the project, except for libraries. Can be removed in svelte 6.
        runes: ({ filename }) => (filename.split(/[/\\]/).includes('node_modules') ? undefined : true)
      },
      adapter: adapter(),
      // Every route is static, so there is nothing to discover by following links;
      // links like /qbar/ point at sibling GitHub Pages sites this build doesn't own.
      prerender: { crawl: false }
    })
  ]
});
