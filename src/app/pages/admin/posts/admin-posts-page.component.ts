import { Component, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  getFirestore,
  orderBy,
  query
} from 'firebase/firestore';
import { fetchCategoriesOrderedByName, type Category } from '../../../services/categories.firestore';

type AdminPost = {
  id: string;
  title: string;
  description: string;
  content: string;
  created_at: string; // ISO string
  main_img: string;
  category_ids: string[];
  tags: string[];
};

@Component({
  selector: 'app-admin-posts-page',
  standalone: true,
  imports: [DatePipe, RouterLink],
  templateUrl: 'admin-posts.component.html'
})
export class AdminPostsPageComponent implements OnInit {
  private readonly db = getFirestore();

  readonly posts = signal<AdminPost[]>([]);
  readonly loading = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  // form state (matches provided JSON)
  readonly title = signal<string>('');
  readonly description = signal<string>('');
  readonly content = signal<string>('');
  // keep as datetime-local string in UI, convert to ISO for storage
  readonly createdAtLocal = signal<string>(''); // e.g. "2026-02-08T14:30"
  readonly mainImg = signal<string>('');
  // CSV inputs that serialize into arrays
  readonly categoryIdsCsv = signal<string>(''); // "cat1, cat2"

  readonly tagsCsv = signal<string>(''); // "tag1, tag2"
  // tag select
  readonly availableTags = signal<string[]>(['tag1', 'tag2', 'tag3']);
  readonly selectedTags = signal<string[]>([]);

  // categories (fetched)
  readonly categories = signal<Category[]>([]);
  readonly categoriesLoading = signal<boolean>(false);

  // category select helpers
  readonly selectedCategoryIds = signal<string[]>([]);

  ngOnInit(): void {
    void this.fetchPosts();
    void this.fetchCategories();
  }

  private parseCsv(value: string): string[] {
    return (value ?? '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
  }

  private localToIso(local: string): string {
    // datetime-local has no timezone; Date treats it as local time and toISOString() stores UTC.
    if (!local?.trim()) return new Date().toISOString();
    const d = new Date(local);
    if (Number.isNaN(d.getTime())) return new Date().toISOString();
    return d.toISOString();
  }

  private isoToLocalInput(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  async fetchPosts() {
    if (this.loading()) return;
    this.loading.set(true);
    this.error.set(null);

    try {
      const q = query(collection(this.db, 'posts'), orderBy('created_at', 'desc'));
      const snap = await getDocs(q);

      const items: AdminPost[] = snap.docs.map(d => {
        const data: any = d.data();
        return {
          id: d.id,
          title: String(data?.title ?? ''),
          description: String(data?.description ?? ''),
          content: String(data?.content ?? ''),
          created_at: String(data?.created_at ?? ''),
          main_img: String(data?.main_img ?? ''),
          category_ids: Array.isArray(data?.category_ids) ? data.category_ids.map(String) : [],
          tags: Array.isArray(data?.tags) ? data.tags.map(String) : []
        };
      });

      this.posts.set(items);
    } catch (e: any) {
      this.error.set(e?.message ?? 'Failed to load posts');
    } finally {
      this.loading.set(false);
    }
  }

  async fetchCategories() {
    if (this.categoriesLoading()) return;
    this.categoriesLoading.set(true);

    try {
      this.categories.set(await fetchCategoriesOrderedByName(this.db));
    } catch (e: any) {
      // keep posts errors separate; show category fetch errors in the same banner for simplicity
      this.error.set(e?.message ?? 'Failed to load categories');
    } finally {
      this.categoriesLoading.set(false);
    }
  }

  onCategoryIdsChange(selectedOptions: HTMLOptionsCollection) {
    const ids = Array.from(selectedOptions)
      .filter(option => option.selected)
      .map(option => option.value);
    this.selectedCategoryIds.set(ids);
    this.categoryIdsCsv.set(ids.join(', '));
  }

  async addPost() {
    const title = this.title().trim();
    const description = this.description().trim();
    const content = this.content().trim();
    const main_img = this.mainImg().trim();

    if (!title) return this.error.set('Title is required.');
    if (!description) return this.error.set('Description is required.');
    if (!content) return this.error.set('Content is required.');

    const payload = {
      title,
      description,
      content,
      created_at: this.localToIso(this.createdAtLocal()),
      main_img,
      category_ids: this.parseCsv(this.categoryIdsCsv()),
      tags: this.selectedTags()
    };

    this.loading.set(true);
    this.error.set(null);
    try {
      await addDoc(collection(this.db, 'posts'), payload);

      // reset form
      this.title.set('');
      this.description.set('');
      this.content.set('');
      this.createdAtLocal.set('');
      this.mainImg.set('');
      this.categoryIdsCsv.set('');
      this.selectedCategoryIds.set([]);
      this.selectedTags.set([]);
      this.loading.set(false);
      await this.fetchPosts();
    } catch (e: any) {
      this.error.set(e?.message ?? 'Failed to add post');
    } finally {
      this.loading.set(false);
    }
  }

  async removePost(id: string) {
    if (!id) return;
    this.loading.set(true);
    this.error.set(null);

    try {
      await deleteDoc(doc(this.db, 'posts', id));
      this.loading.set(false);
      await this.fetchPosts();
    } catch (e: any) {
      this.error.set(e?.message ?? 'Failed to delete post');
    } finally {
      this.loading.set(false);
    }
  }

  fillCreatedNow() {
    this.createdAtLocal.set(this.isoToLocalInput(new Date().toISOString()));
  }
}
