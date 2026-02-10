import {Component, computed, OnInit, signal} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  getFirestore,
  // collection,
  // addDoc,
  // deleteDoc,
  // doc,
  // updateDoc,
} from 'firebase/firestore';
import {
  addCategory,
  fetchCategoriesOrderedByName,
  removeCategory,
  updateCategory,
  type CategoryDoc,
} from '../../../services/categories.firestore';
import {CategoryItem} from '../../../types/category.types';

type Category = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  postCount?: number;
};

// type CategoryDoc = Omit<Category, 'id'>; // moved to service

function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

@Component({
  selector: 'app-admin-categories-page',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: 'admin-categories.component.html',
})
export class AdminCategoriesPageComponent implements OnInit {
  private readonly db = getFirestore();
  // private readonly categoriesCol = collection(this.db, 'categories');

  readonly categories = signal<CategoryItem[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  newName = '';
  newDescription = '';

  readonly editingId = signal<string | null>(null);
  editName = '';
  editDescription = '';

  readonly canAdd = computed(() => this.newName.trim().length > 0 && !this.loading());

  async ngOnInit() {
    await this.fetchCategories();
  }

  private async fetchCategories() {
    if (this.loading()) return;
    this.loading.set(true);
    this.error.set(null);

    try {
      this.categories.set(await fetchCategoriesOrderedByName(this.db));
    } catch (e: any) {
      this.error.set(e?.message ?? 'Failed to load categories.');
    } finally {
      this.loading.set(false);
    }
  }

  async add() {
    const name = this.newName.trim();
    if (!name || this.loading()) return;

    const descriptionRaw = this.newDescription.trim();
    const slug = slugify(name);

    // prevent duplicates by slug (client-side; keep until you add a unique constraint)
    if (this.categories().some((c) => c.slug === slug)) return;

    this.loading.set(true);
    this.error.set(null);

    try {
      const payload: CategoryDoc = {
        name,
        slug,
        description: descriptionRaw || undefined,
        postCount: 0,
      };

      await addCategory(this.db, payload);

      this.newName = '';
      this.newDescription = '';
      this.loading.set(false);
      await this.fetchCategories();
    } catch (e: any) {
      this.error.set(e?.message ?? 'Failed to add category.');
    } finally {
      this.loading.set(false);
    }
  }

  async remove(id: string) {
    if (!id || this.loading()) return;

    this.loading.set(true);
    this.error.set(null);

    try {
      await removeCategory(this.db, id);
      this.loading.set(false);
      await this.fetchCategories();
    } catch (e: any) {
      this.error.set(e?.message ?? 'Failed to delete category.');
    } finally {
      this.loading.set(false);
    }
  }

  startEdit(c: CategoryItem) {
    this.editingId.set(c.id);
    this.editName = c.title ?? '';
    this.editDescription = c.description ?? '';
  }

  cancelEdit() {
    this.editingId.set(null);
    this.editName = '';
    this.editDescription = '';
  }

  async saveEdit(id: string) {
    if (!id || this.loading()) return;

    const name = this.editName.trim();
    if (!name) return;

    const description = this.editDescription.trim() || undefined;
    const slug = slugify(name);

    this.loading.set(true);
    this.error.set(null);

    try {
      // prevent duplicates by slug (excluding self)
      if (this.categories().some((c) => c.id !== id && c.slug === slug)) return;

      await updateCategory(this.db, id, { name, slug, description });

      this.cancelEdit();
      this.loading.set(false);
      await this.fetchCategories();
    } catch (e: any) {
      this.error.set(e?.message ?? 'Failed to update category.');
    } finally {
      this.loading.set(false);
    }
  }
}
