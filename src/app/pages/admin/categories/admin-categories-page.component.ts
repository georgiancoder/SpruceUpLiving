import {Component, computed, OnInit, signal} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  getFirestore,
  collection,
  getDocs,
  query,
  orderBy,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
} from 'firebase/firestore';

type Category = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  postCount?: number;
};

type CategoryDoc = Omit<Category, 'id'>;

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
  private readonly categoriesCol = collection(this.db, 'categories');

  readonly categories = signal<Category[]>([]);
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
      const q = query(this.categoriesCol, orderBy('name', 'asc'));
      const snap = await getDocs(q);

      const rows: Category[] = snap.docs.map((d) => {
        const data = d.data() as Partial<CategoryDoc>;
        return {
          id: d.id,
          name: String(data.name ?? ''),
          slug: String(data.slug ?? ''),
          description: typeof data.description === 'string' ? data.description : undefined,
          postCount: typeof data.postCount === 'number' ? data.postCount : undefined,
        };
      });

      this.categories.set(rows);
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

      await addDoc(this.categoriesCol, payload);

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
      await deleteDoc(doc(this.db, 'categories', id));
      this.loading.set(false);
      await this.fetchCategories();
    } catch (e: any) {
      this.error.set(e?.message ?? 'Failed to delete category.');
    } finally {
      this.loading.set(false);
    }
  }

  startEdit(c: Category) {
    this.editingId.set(c.id);
    this.editName = c.name ?? '';
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

      await updateDoc(doc(this.db, 'categories', id), {
        name,
        slug,
        description,
      });

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
