import { error } from '@sveltejs/kit';
import { pathOf, placeAt, places } from '#lib/code.ts';
import type { EntryGenerator, PageLoad } from './$types';

export const prerender = true;
/** Places are directories, so each is built as its own index.html. */
export const trailingSlash = 'always';

export const entries: EntryGenerator = () => places.map(place => ({ path: pathOf(place).slice(1, -1) }));

export const load: PageLoad = ({ params }) => {
  const place = placeAt(`/${params.path}`);
  if (!place) error(404, `Nothing in the code is called /${params.path}`);
  return { place };
};
