import { basename } from 'node:path';
import { cpSync } from 'node:fs';

// Path Follower is an older standalone demo kept at its stable URL. It is a git
// submodule, so it can't live in static/: SvelteKit would publish its .git file.
cpSync('path-follower', 'build/path-follower', {
  recursive: true,
  filter: source => basename(source) !== '.git'
});
