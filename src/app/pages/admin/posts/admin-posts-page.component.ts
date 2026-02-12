import {Component, OnInit, signal, computed} from '@angular/core';
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
import { FormsModule } from '@angular/forms';
import { EditorModule } from '@tinymce/tinymce-angular';
import { fetchCategoriesOrderedByName } from '../../../services/categories.firestore';
import { fetchPostsOrderedByCreatedAtDesc, type AdminPost } from '../../../services/posts.firestore';
import {CategoryItem} from '../../../types/category.types';

@Component({
  selector: 'app-admin-posts-page',
  standalone: true,
  imports: [DatePipe, RouterLink, EditorModule, FormsModule],
  templateUrl: 'admin-posts.component.html'
})
export class AdminPostsPageComponent implements OnInit {
  private readonly db = getFirestore();
  private readonly storage = getStorage();

  readonly posts = signal<AdminPost[]>([]);
  readonly loading = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  // editor image upload progress state (used by TinyMCE `images_upload_handler`)
  readonly uploadingEditorImage = signal<boolean>(false);
  readonly editorImageUploadProgress = signal<number>(0);

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

  // TinyMCE editor config (shared between create/edit)
  readonly tinyMceInit: Record<string, any> = {
    apiKey: 'd4j3xne2ooctby1b3c0xmbi0jq1ghgrf9pznbks3nbtda698',
    height: 360,
    menubar: false,
    branding: false,
    plugins: 'lists link image code autoresize',
    toolbar: 'undo redo | blocks fontfamily fontsize | bold italic underline strikethrough | link media table mergetags | addcomment showcomments | spellcheckdialog a11ycheck typography uploadcare | align lineheight | checklist numlist bullist indent outdent | emoticons charmap | link image | removeformat',
    content_style: 'img{max-width:100%;height:auto;}',
    images_upload_handler: async (blobInfo: any) => {
      const file: File = blobInfo.blob();
      return await this.uploadEditorImage(file);
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
      // read before delete so we know which counters to decrement + which images to delete
      const postRef = doc(this.db, 'posts', id);
      const snap = await getDoc(postRef);
      const data: any = snap.exists() ? snap.data() : null;

      const categoryIds = Array.from(
        new Set(Array.isArray(data?.category_ids) ? data.category_ids.map(String) : [])
      ).filter(Boolean);

      const mainImgPath = data?.main_img_path ? String(data.main_img_path) : '';
      const contentHtml: string = data?.content ? String(data.content) : '';

      // delete main image (best-effort)
      if (mainImgPath) {
        try {
          await deleteObject(ref(this.storage, mainImgPath));
        } catch (e: any) {
          this.error.set(e?.message ?? 'Failed to delete post main image from storage (post will still be deleted)');
        }
      }

      // delete embedded editor images (best-effort)
      const imgSrcs = this.extractImageSrcsFromHtml(contentHtml);
      const contentPaths = imgSrcs
        .map((src) => this.storagePathFromFirebaseDownloadUrl(src))
        .filter((p): p is string => !!p);

      const imgDeleteRes = await this.deleteStorageObjectsBestEffort(contentPaths);
      if (imgDeleteRes.failed > 0) {
        this.error.set(`Post will be deleted, but ${imgDeleteRes.failed} embedded image(s) could not be deleted from Storage.`);
      }

      await deleteDoc(postRef);

      // best-effort: decrement postCount for each category referenced by the deleted post
      try {
        if (categoryIds.length) {
          const batch = writeBatch(this.db);
          for (const cid of categoryIds) {
            const cRef = doc(this.db, 'categories', cid as string);
            batch.set(cRef, { postCount: increment(-1) }, { merge: true });
            batch.update(cRef, {});
          }
          await batch.commit();
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

      // --- NEW: check removed embedded images on content update (best-effort delete) ---
      const prevContentHtml: string = prevData?.content ? String(prevData.content) : '';
      const nextContentHtml: string = content;

      if (prevContentHtml && nextContentHtml && prevContentHtml !== nextContentHtml) {
        const prevSrcs = new Set(this.extractImageSrcsFromHtml(prevContentHtml));
        const nextSrcs = new Set(this.extractImageSrcsFromHtml(nextContentHtml));

        const removedSrcs = Array.from(prevSrcs).filter((src) => !nextSrcs.has(src));
        const removedPaths = removedSrcs
          .map((src) => this.storagePathFromFirebaseDownloadUrl(src))
          .filter((p): p is string => !!p);

        // Only delete from Storage if the URL is a Firebase Storage download URL
        // (so external images are untouched)
        if (removedPaths.length) {
          const res = await this.deleteStorageObjectsBestEffort(removedPaths);
          if (res.failed > 0) {
            this.error.set(`Post updated, but ${res.failed} removed embedded image(s) could not be deleted from Storage.`);
          }
        }
      }

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

  private async uploadEditorImage(file: File): Promise<string> {
    this.uploadingEditorImage.set(true);
    this.editorImageUploadProgress.set(0);
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
            this.editorImageUploadProgress.set(pct);
          },
          (err) => reject(err),
          () => resolve()
        );
      });

      return await getDownloadURL(storageRef);
    } catch (e: any) {
      this.error.set(e?.message ?? 'Failed to upload image');
      throw e;
    } finally {
      this.uploadingEditorImage.set(false);
      this.editorImageUploadProgress.set(0);
    }
  }

  private extractImageSrcsFromHtml(html: string): string[] {
    if (!html?.trim()) return [];
    try {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      return Array.from(doc.querySelectorAll('img'))
        .map((img) => img.getAttribute('src') || '')
        .filter(Boolean);
    } catch {
      return [];
    }
  }

  private storagePathFromFirebaseDownloadUrl(url: string): string | null {
    // Handles URLs like:
    // https://firebasestorage.googleapis.com/v0/b/<bucket>/o/post-content-images%2F...?...token=...
    try {
      const u = new URL(url);
      if (!u.hostname.includes('firebasestorage.googleapis.com')) return null;
      const parts = u.pathname.split('/o/');
      if (parts.length < 2) return null;

      // Strip any extra path segments after the encoded object path
      const encoded = parts[1].split('/')[0];
      return decodeURIComponent(encoded);
    } catch {
      return null;
    }
  }

  private async deleteStorageObjectsBestEffort(paths: string[]): Promise<{ deleted: number; failed: number }> {
    const unique = Array.from(new Set(paths.filter(Boolean)));
    let deleted = 0;
    let failed = 0;

    await Promise.all(
      unique.map(async (p) => {
        try {
          await deleteObject(ref(this.storage, p));
          deleted += 1;
        } catch {
          failed += 1;
        }
      })
    );

    return { deleted, failed };
  }

  async deletePost(postId: string) {
    this.loading.set(true);
    this.error.set(null);

    try {
      const postRef = doc(this.db, 'posts', postId);
      const snap = await getDoc(postRef);
      const data = snap.exists() ? (snap.data() as any) : null;

      const mainImgPath: string | null = data?.main_img_path ?? null;
      const contentHtml: string = data?.content ?? '';

      // delete main image (same behavior as before)
      if (mainImgPath) {
        try {
          await deleteObject(ref(this.storage, mainImgPath));
        } catch {
          // best-effort
        }
      }

      // delete editor-inserted content images
      const imgSrcs = this.extractImageSrcsFromHtml(contentHtml);
      const contentPaths = imgSrcs
        .map((src) => this.storagePathFromFirebaseDownloadUrl(src))
        .filter((p): p is string => !!p);

      const res = await this.deleteStorageObjectsBestEffort(contentPaths);

      // finally delete doc
      await deleteDoc(postRef);

      if (res.failed > 0) {
        this.error.set(`Post deleted, but ${res.failed} embedded image(s) could not be deleted from Storage.`);
      }

      await this.fetchPosts();
    } catch (e: any) {
      this.error.set(e?.message ?? 'Failed to delete post');
    } finally {
      this.loading.set(false);
    }
  }
}
