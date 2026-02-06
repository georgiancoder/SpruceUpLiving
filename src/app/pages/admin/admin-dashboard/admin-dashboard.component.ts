import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="space-y-6">
      <header>
        <h1 class="text-2xl font-semibold tracking-tight text-gray-900">Dashboard</h1>
        <p class="mt-1 text-sm text-gray-600">Quick overview and shortcuts.</p>
      </header>

      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <a
          class="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow"
          routerLink="/admin/posts"
        >
          <div class="text-sm font-medium text-gray-900">Posts</div>
          <div class="mt-1 text-sm text-gray-600">Create, edit, and publish</div>
        </a>

        <a
          class="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow"
          routerLink="/admin/categories"
        >
          <div class="text-sm font-medium text-gray-900">Categories</div>
          <div class="mt-1 text-sm text-gray-600">Organize site taxonomy</div>
        </a>

        <a
          class="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow"
          routerLink="/admin/newsletter"
        >
          <div class="text-sm font-medium text-gray-900">Newsletter</div>
          <div class="mt-1 text-sm text-gray-600">Subscribers and exports</div>
        </a>
      </div>

      <div class="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 class="text-sm font-semibold text-gray-900">Status</h2>
        <dl class="mt-3 grid gap-4 sm:grid-cols-3">
          <div>
            <dt class="text-xs text-gray-500">Draft posts</dt>
            <dd class="mt-1 text-lg font-semibold text-gray-900">—</dd>
          </div>
          <div>
            <dt class="text-xs text-gray-500">Published posts</dt>
            <dd class="mt-1 text-lg font-semibold text-gray-900">—</dd>
          </div>
          <div>
            <dt class="text-xs text-gray-500">Subscribers</dt>
            <dd class="mt-1 text-lg font-semibold text-gray-900">—</dd>
          </div>
        </dl>
        <p class="mt-3 text-xs text-gray-500">Connect to your backend to populate these stats.</p>
      </div>
    </section>
  `,
})
export class AdminDashboardComponent {}

