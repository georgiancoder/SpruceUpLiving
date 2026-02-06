import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

type Category = {
  id: string;
  name: string;
  slug: string;
  postCount?: number;
};

function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

@Component({
  selector: 'app-admin-categories-page',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: "admin-categories.component.html"
})
export class AdminCategoriesPageComponent {
  readonly categories = signal<Category[]>([
    { id: uid(), name: 'Living Room', slug: 'living-room', postCount: 12 },
    { id: uid(), name: 'Bedroom', slug: 'bedroom', postCount: 8 },
    { id: uid(), name: 'Kitchen', slug: 'kitchen', postCount: 5 },
  ]);

  newName = '';

  readonly canAdd = computed(() => this.newName.trim().length > 0);

  add() {
    const name = this.newName.trim();
    if (!name) return;

    const slug = slugify(name);

    // prevent duplicates by slug
    if (this.categories().some((c) => c.slug === slug)) return;

    this.categories.update((list) => [
      { id: uid(), name, slug, postCount: 0 },
      ...list,
    ]);
    this.newName = '';
  }

  remove(id: string) {
    this.categories.update((list) => list.filter((c) => c.id !== id));
  }
}
