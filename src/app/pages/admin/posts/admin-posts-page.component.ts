import {Component, OnInit, signal, computed, ViewChild} from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getFirestore,
  increment,
  writeBatch,
  updateDoc,
} from 'firebase/firestore';
import { deleteObject, getDownloadURL, getStorage, ref, uploadBytes, uploadBytesResumable } from 'firebase/storage';
import {QuillEditorComponent, QuillModule} from 'ngx-quill';
import { FormsModule } from '@angular/forms';
import { fetchCategoriesOrderedByName, type Category } from '../../../services/categories.firestore';
import { fetchPostsOrderedByCreatedAtDesc, type AdminPost } from '../../../services/posts.firestore';
import {CategoryItem} from '../../../types/category.types';

@Component({
  selector: 'app-admin-posts-page',
  standalone: true,
  imports: [DatePipe, RouterLink, QuillModule, FormsModule],
  templateUrl: 'admin-posts.component.html'
})
export class AdminPostsPageComponent implements OnInit {
  private readonly db = getFirestore();
  private readonly storage = getStorage();

  @ViewChild('createQuillEditor') createQuillRef?: QuillEditorComponent;
  @ViewChild('editQuillEditor') editQuillRef?: QuillEditorComponent;

  // track which editor invoked the toolbar handler
  protected activeQuillTarget: 'create' | 'edit' = 'create';

  readonly posts = signal<AdminPost[]>([]);
  readonly loading = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  readonly uploadingQuillImage = signal<boolean>(false);
  readonly quillImageUploadProgress = signal<number>(0);

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
  readonly categories = signal<CategoryItem[]>([]);
  readonly categoriesLoading = signal<boolean>(false);

  // category select helpers
  readonly selectedCategoryIds = signal<string[]>([]);

  // main image upload (store URL in main_img)
  readonly mainImgFile = signal<File | null>(null);
  readonly mainImgPreviewUrl = signal<string | null>(null);

  // edit state
  readonly editingPostId = signal<string | null>(null);
  readonly editTitle = signal<string>('');
  readonly editDescription = signal<string>('');
  readonly editContent = signal<string>('');
  readonly editCreatedAtLocal = signal<string>('');
  readonly editSelectedCategoryIds = signal<string[]>([]);
  readonly editSelectedTags = signal<string[]>([]);
  readonly editMainImgFile = signal<File | null>(null);
  readonly editMainImgPreviewUrl = signal<string | null>(null);

  // optional: keep toolbar consistent across create/edit editors
  readonly quillModules = {
    toolbar: {
      container: [
        ['bold', 'italic', 'underline', 'strike'],
        [{ header: [1, 2, 3, false] }],
        [{ list: 'ordered' }, { list: 'bullet' }],
        ['blockquote', 'code-block'],
        ['link', 'image'],
        [{ align: [] }],
        ['clean'],
      ],
      handlers: {
        image: () => this.pickAndUploadQuillImage(),
      },
    },
  };

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
      this.posts.set(await fetchPostsOrderedByCreatedAtDesc(this.db));
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

    if (!title) return this.error.set('Title is required.');
    if (!description) return this.error.set('Description is required.');
    if (!content) return this.error.set('Content is required.');

    const categoryIds = Array.from(new Set(this.parseCsv(this.categoryIdsCsv()))).filter(Boolean);

    this.loading.set(true);
    this.error.set(null);

    try {
      // upload image (optional)
      let main_img = '';
      let main_img_path: string | undefined;

      const file = this.mainImgFile();
      if (file) {
        const safeName = (file.name || 'image').replace(/[^\w.\-]+/g, '_');
        main_img_path = `posts/${Date.now()}_${crypto.randomUUID()}_${safeName}`;
        const storageRef = ref(this.storage, main_img_path);
        await uploadBytes(storageRef, file, { contentType: file.type || undefined });
        main_img = await getDownloadURL(storageRef);
      }

      const payload = {
        title,
        description,
        content,
        created_at: this.localToIso(this.createdAtLocal()),
        main_img,
        ...(main_img_path ? { main_img_path } : {}),
        category_ids: categoryIds,
        tags: this.selectedTags(),
      };

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
      this.mainImgFile.set(null);
      this.mainImgPreviewUrl.set(null);
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
      // read before delete so we know which counters to decrement + which image to delete
      const postRef = doc(this.db, 'posts', id);
      const snap = await getDoc(postRef);
      const data: any = snap.exists() ? snap.data() : null;

      const categoryIds = Array.from(
        new Set(Array.isArray(data?.category_ids) ? data.category_ids.map(String) : [])
      ).filter(Boolean);

      const mainImgPath = data?.main_img_path ? String(data.main_img_path) : '';

      // best-effort: delete storage object first (if we have a path)
      if (mainImgPath) {
        try {
          await deleteObject(ref(this.storage, mainImgPath));
        } catch (e: any) {
          // continue deleting the post doc; just show a warning
          this.error.set(e?.message ?? 'Failed to delete post image from storage (post will still be deleted)');
        }
      }

      await deleteDoc(postRef);

      // best-effort: decrement postCount for each category referenced by the deleted post
      try {
        if (categoryIds.length) {
          const batch = writeBatch(this.db);
          for (const cid of categoryIds) {
            const ref = doc(this.db, 'categories', cid as string);
            batch.set(ref, { postCount: increment(-1) }, { merge: true });
            batch.update(ref, {});
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

  onMainImgSelected(input: HTMLInputElement) {
    const file = input.files?.[0] ?? null;
    this.mainImgFile.set(file);

    const prev = this.mainImgPreviewUrl();
    if (prev) URL.revokeObjectURL(prev);

    this.mainImgPreviewUrl.set(file ? URL.createObjectURL(file) : null);
  }

  clearMainImg(input?: HTMLInputElement) {
    this.mainImgFile.set(null);
    const prev = this.mainImgPreviewUrl();
    if (prev) URL.revokeObjectURL(prev);
    this.mainImgPreviewUrl.set(null);
    if (input) input.value = '';
  }

  startEdit(p: AdminPost) {
    this.error.set(null);
    this.editingPostId.set(p.id);
    this.editTitle.set(p.title ?? '');
    this.editDescription.set(p.description ?? '');
    this.editContent.set(p.content ?? '');
    this.editCreatedAtLocal.set(p.created_at ? this.isoToLocalInput(p.created_at) : '');
    this.editSelectedCategoryIds.set(Array.isArray(p.category_ids) ? [...p.category_ids] : []);

    const tags = Array.isArray(p.tags) ? p.tags : [];
    this.editSelectedTags.set(tags.map((t: any) => (typeof t === 'string' ? t : String(t?.title ?? ''))).filter(Boolean));

    this.editMainImgFile.set(null);
    const prev = this.editMainImgPreviewUrl();
    if (prev) URL.revokeObjectURL(prev);
    this.editMainImgPreviewUrl.set(null);
  }

  cancelEdit(editImgInput?: HTMLInputElement) {
    this.editingPostId.set(null);
    this.editTitle.set('');
    this.editDescription.set('');
    this.editContent.set('');
    this.editCreatedAtLocal.set('');
    this.editSelectedCategoryIds.set([]);
    this.editSelectedTags.set([]);
    this.editMainImgFile.set(null);
    const prev = this.editMainImgPreviewUrl();
    if (prev) URL.revokeObjectURL(prev);
    this.editMainImgPreviewUrl.set(null);
    if (editImgInput) editImgInput.value = '';
  }

  onEditCategoryIdsChange(selectedOptions: HTMLOptionsCollection) {
    const ids = Array.from(selectedOptions)
      .filter(o => o.selected)
      .map(o => o.value);
    this.editSelectedCategoryIds.set(ids);
  }

  onEditMainImgSelected(input: HTMLInputElement) {
    const file = input.files?.[0] ?? null;
    this.editMainImgFile.set(file);

    const prev = this.editMainImgPreviewUrl();
    if (prev) URL.revokeObjectURL(prev);
    this.editMainImgPreviewUrl.set(file ? URL.createObjectURL(file) : null);
  }

  clearEditMainImg(input?: HTMLInputElement) {
    this.editMainImgFile.set(null);
    const prev = this.editMainImgPreviewUrl();
    if (prev) URL.revokeObjectURL(prev);
    this.editMainImgPreviewUrl.set(null);
    if (input) input.value = '';
  }

  private setDelta(a: string[], b: string[]) {
    const A = new Set((a ?? []).filter(Boolean));
    const B = new Set((b ?? []).filter(Boolean));
    const toAdd: string[] = [];
    const toRemove: string[] = [];
    for (const x of B) if (!A.has(x)) toAdd.push(x);
    for (const x of A) if (!B.has(x)) toRemove.push(x);
    return { toAdd, toRemove };
  }

  async saveEdit(postId: string) {
    if (!postId) return;

    const title = this.editTitle().trim();
    const description = this.editDescription().trim();
    const content = this.editContent().trim();

    if (!title) return this.error.set('Title is required.');
    if (!description) return this.error.set('Description is required.');
    if (!content) return this.error.set('Content is required.');

    this.loading.set(true);
    this.error.set(null);

    try {
      const postRef = doc(this.db, 'posts', postId);
      const snap = await getDoc(postRef);
      if (!snap.exists()) throw new Error('Post not found');

      const prevData: any = snap.data();
      const prevCategoryIds = Array.isArray(prevData?.category_ids) ? prevData.category_ids.map(String) : [];
      const nextCategoryIds = Array.from(new Set(this.editSelectedCategoryIds().map(String))).filter(Boolean);
      const { toAdd, toRemove } = this.setDelta(prevCategoryIds, nextCategoryIds);

      // optional image replacement
      let main_img = String(prevData?.main_img ?? '');
      let main_img_path: string | undefined = prevData?.main_img_path ? String(prevData.main_img_path) : undefined;

      const newFile = this.editMainImgFile();
      if (newFile) {
        const safeName = (newFile.name || 'image').replace(/[^\w.\-]+/g, '_');
        const newPath = `posts/${Date.now()}_${crypto.randomUUID()}_${safeName}`;
        const storageRef = ref(this.storage, newPath);
        await uploadBytes(storageRef, newFile, { contentType: newFile.type || undefined });
        const newUrl = await getDownloadURL(storageRef);

        const oldPath = main_img_path;
        main_img = newUrl;
        main_img_path = newPath;

        // best-effort delete old storage object after new one is safely uploaded
        if (oldPath) {
          try {
            await deleteObject(ref(this.storage, oldPath));
          } catch {
            // ignore; post doc will still point to the new image
          }
        }
      }

      const payload = {
        title,
        description,
        content,
        created_at: this.localToIso(this.editCreatedAtLocal()),
        category_ids: nextCategoryIds,
        tags: this.editSelectedTags(),
        main_img,
        ...(main_img_path ? { main_img_path } : { main_img_path: '' }),
      };

      await updateDoc(postRef, payload);

      // best-effort: update category postCount deltas
      try {
        if (toAdd.length || toRemove.length) {
          const batch = writeBatch(this.db);
          for (const cid of toAdd) {
            const cRef = doc(this.db, 'categories', cid);
            batch.set(cRef, { postCount: increment(1) }, { merge: true });
            batch.update(cRef, {});
          }
          for (const cid of toRemove) {
            const cRef = doc(this.db, 'categories', cid);
            batch.set(cRef, { postCount: increment(-1) }, { merge: true });
            batch.update(cRef, {});
          }
          await batch.commit();
          void this.fetchCategories();
        }
      } catch (e: any) {
        this.error.set(e?.message ?? 'Post updated, but failed to update category postCount');
      }
      this.loading.set(false);
      await this.fetchPosts();
      this.cancelEdit();
    } catch (e: any) {
      this.error.set(e?.message ?? 'Failed to update post');
    } finally {
      this.loading.set(false);
    }
  }

  protected onTagsChange(s: string) {
    this.editSelectedTags.set(s.split(',').map((s: string) => s.trim()).filter(Boolean))
  }

  private pickAndUploadQuillImage() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.click();

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      await this.uploadQuillImageAndInsert(file);
    };
  }

  private getActiveQuillInstance(): any | null {
    const ref = this.activeQuillTarget === 'edit' ? this.editQuillRef : this.createQuillRef;
    // ngx-quill exposes the Quill instance as `.quillEditor`
    return (ref as any)?.quillEditor ?? null;
  }

  private async uploadQuillImageAndInsert(file: File) {
    const quill = this.getActiveQuillInstance();
    if (!quill) {
      this.error.set('Quill editor not ready.');
      return;
    }

    this.uploadingQuillImage.set(true);
    this.quillImageUploadProgress.set(0);
    this.error.set(null);

    try {
      const safeName = (file.name || 'image').replace(/[^\w.\-]+/g, '_');
      const path = `post-content-images/${Date.now()}_${crypto.randomUUID()}_${safeName}`;
      const storageRef = ref(this.storage, path);

      const task = uploadBytesResumable(storageRef, file, { contentType: file.type || undefined });

      await new Promise<void>((resolve, reject) => {
        task.on(
          'state_changed',
          (snap) => {
            const total = snap.totalBytes || 0;
            const done = snap.bytesTransferred || 0;
            const pct = total > 0 ? Math.round((done / total) * 100) : 0;
            this.quillImageUploadProgress.set(pct);
          },
          (err) => reject(err),
          () => resolve()
        );
      });

      const url = await getDownloadURL(storageRef);

      const range = quill.getSelection?.(true);
      const index = range?.index ?? quill.getLength?.() ?? 0;
      quill.insertEmbed(index, 'image', url, 'user');
      quill.setSelection(index + 1, 0, 'silent');
    } catch (e: any) {
      this.error.set(e?.message ?? 'Failed to upload image');
    } finally {
      this.uploadingQuillImage.set(false);
      this.quillImageUploadProgress.set(0);
    }
  }
}
