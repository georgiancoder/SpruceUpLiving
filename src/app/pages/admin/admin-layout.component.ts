import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterOutlet],
  template: `
    <div class="min-h-dvh bg-gray-50">
      <main class="bg-gradient-to-br from-amber-50/90 via-white to-amber-50/80 min-h-screen flex items-center justify-center py-8 px-4 sm:px-6 lg:px-8 antialiased font-sans">
        <router-outlet />
      </main>
    </div>
  `,
})
export class AdminLayoutComponent {}

