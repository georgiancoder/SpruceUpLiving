import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { collection, doc, getDoc, getDocs, getFirestore, limit, query, where } from 'firebase/firestore';
import { estimateReadingMinutesFromPost } from '../../utils/reading-time';
import { SuggestedPostsComponent } from '../../components/suggested-posts/suggested-posts.component';

type PostDoc = {
  title?: string;
  description?: string;
  content?: string; // HTML (Quill)
  created_at?: string | Date;
  main_img?: string;
  category_ids?: string[];
  tags?: string[];
  slug?: string;
};

type PostVM = {
  id: string;
  slug?: string;
  title: string;
  description: string;
  contentHtml: string;
  createdAt?: string | Date;
  mainImgUrl?: string;
  categoryIds: string[];
  tags: string[];
  readMinutes?: number | null;
};

@Component({
  selector: 'app-post-page',
  standalone: true,
  imports: [RouterLink, DatePipe, SuggestedPostsComponent],
  templateUrl: './post-page.component.html',
  styleUrl: './post-page.component.css',
})
export class PostPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);

  loading = signal(false);
  error = signal<string | null>(null);
  post = signal<PostVM | null>(null);

  ngOnInit() {
    this.route.paramMap.subscribe((pm) => {
      const identifier = pm.get('postId'); // can be doc id OR slug
      if (!identifier) {
        this.post.set(null);
        this.error.set('Missing post id.');
        return;
      }
      void this.fetchPost(identifier);
    });
  }

  async fetchPost(identifier: string) {
    this.loading.set(true);
    this.error.set(null);

    try {
      const db = getFirestore();

      // 1) Try by document id (existing behavior)
      let snap = await getDoc(doc(db, 'posts', identifier));

      // 2) Fallback: try by slug
      if (!snap.exists()) {
        const q = query(
          collection(db, 'posts'),
          where('slug', '==', identifier),
          limit(1),
        );
        const qs = await getDocs(q);
        snap = qs.docs[0] as any;
      }

      if (!snap || !('exists' in snap) ? true : !snap.exists()) {
        this.post.set(null);
        this.error.set('Post not found.');
        return;
      }

      const data = (snap.data() as PostDoc) ?? {};

      const readMinutes = estimateReadingMinutesFromPost({
        title: data.title ?? '',
        description: data.description ?? '',
        content: data.content ?? '',
      });

      const vm: PostVM = {
        id: snap.id,
        slug: (data.slug ?? '').trim() || undefined,
        title: (data.title ?? '').trim() || 'Untitled post',
        description: (data.description ?? '').trim(),
        contentHtml: data.content ?? '',
        createdAt: data.created_at,
        mainImgUrl: data.main_img,
        categoryIds: Array.isArray(data.category_ids) ? data.category_ids : [],
        tags: Array.isArray(data.tags) ? data.tags : [],
        readMinutes,
      };

      this.post.set(vm);
      this.saveLastReadPost(vm);

      // Best-effort: increment views via Cloud Function using REAL doc id
      void this.updateViewsViaCloudFunction(vm.id);
    } catch (e: any) {
      this.post.set(null);
      this.error.set(e?.message ?? 'Failed to load post.');
    } finally {
      this.loading.set(false);
    }
  }

  private async updateViewsViaCloudFunction(postId: string) {
    try {
      await fetch(
        'https://us-central1-spruceupliving-d48ba.cloudfunctions.net/updatePostAndCategoryViews',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ postId }),
        },
      );
    } catch {
      // ignore view update failures
    }
  }

  private saveLastReadPost(post: PostVM) {
    try {
      const payload = {
        id: post.id,
        slug: post.slug ?? null,
        title: post.title,
        mainImgUrl: post.mainImgUrl ?? null,
        readAt: new Date().toISOString(),
      };

      localStorage.setItem('spruce:lastReadPost', JSON.stringify(payload));
    } catch {
      // ignore localStorage failures
    }
  }

  asDate(value: unknown): Date | null {
    if (!value) return null;
    if (value instanceof Date) return value;
    const d = new Date(String(value));
    return Number.isNaN(d.getTime()) ? null : d;
  }
}
