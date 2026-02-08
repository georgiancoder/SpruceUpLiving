import { Component, OnInit, signal, computed } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  increment,
  orderBy,
  query,
  writeBatch,
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
  tags: { title: string }[] | string[]; // support both array of strings and array of objects with title
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

  readonly canAddPost = computed(() => {
    return (
      this.title().trim().length > 0 &&
      this.description().trim().length > 0 &&
      this.content().trim().length > 0
    );
  });

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

    const categoryIds = Array.from(new Set(this.parseCsv(this.categoryIdsCsv()))).filter(Boolean);

    const payload = {
      title,
      description,
      content,
      created_at: this.localToIso(this.createdAtLocal()),
      main_img,
      category_ids: categoryIds,
      tags: this.selectedTags()
    };

    this.loading.set(true);
    this.error.set(null);
    try {
      await addDoc(collection(this.db, 'posts'), payload);

      // best-effort: bump postCount for each category referenced by the new post
      try {
        if (categoryIds.length) {
          const batch = writeBatch(this.db);
          for (const cid of categoryIds) {
            const ref = doc(this.db, 'categories', cid);
            // ensures doc exists (no-op if it already does) so increment isn't applied to a missing doc
            batch.set(ref, { postCount: increment(1) }, { merge: true });
            batch.update(ref, {});
          }
          await batch.commit();
          void this.fetchCategories();
        }
      } catch (e: any) {
        this.error.set(e?.message ?? 'Post created, but failed to update category postCount');
      }

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
      // read before delete so we know which counters to decrement
      const postRef = doc(this.db, 'posts', id);
      const snap = await getDoc(postRef);
      const data: any = snap.exists() ? snap.data() : null;
      const categoryIds = Array.from(
        new Set(Array.isArray(data?.category_ids) ? data.category_ids.map(String) : [])
      ).filter(Boolean);

      await deleteDoc(postRef);

      // best-effort: decrement postCount for each category referenced by the deleted post
      try {
        if (categoryIds.length) {
          const batch = writeBatch(this.db);
          for (const cid of categoryIds) {
            const ref = doc(this.db, 'categories', cid as string);
            batch.set(ref, { postCount: increment(-1)}, { merge: true });
            batch.update(ref, { });
          }
          await batch.commit();
          this.loading.set(false);
          void this.fetchCategories();
        }
      } catch (e: any) {
        this.error.set(e?.message ?? 'Post deleted, but failed to update category postCount');
      }

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

  protected onTagsCsvChange( value: string) {
    const tags = this.parseCsv(value);
    this.selectedTags.set(tags);
  }
}
