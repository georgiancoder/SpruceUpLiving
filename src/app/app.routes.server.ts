import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // Static routes can be prerendered.
  { path: '', renderMode: RenderMode.Prerender },
  { path: 'categories', renderMode: RenderMode.Prerender },

  // Parameterized routes can't be prerendered unless getPrerenderParams is provided.
  // Render them on the server at request time instead.
  { path: 'categories/:categoryId', renderMode: RenderMode.Server },
  { path: 'post/:postId', renderMode: RenderMode.Server },

  // Fallback: keep prerender for any other static routes you add later.
  {
    path: '**',
    renderMode: RenderMode.Prerender,
  },
];
