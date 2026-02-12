import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { doc, getDoc, getFirestore } from 'firebase/firestore';

type PostDoc = {
  title?: string;
  description?: string;
  content?: string; // HTML (Quill)
  created_at?: string | Date;
  main_img?: string;
  category_ids?: string[];
  tags?: string[];
};

type PostVM = {
  id: string;
  title: string;
  description: string;
  contentHtml: string;
  createdAt?: string | Date;
  mainImgUrl?: string;
  categoryIds: string[];
  tags: string[];
};

@Component({
  selector: 'app-post-page',
  standalone: true,
  imports: [RouterLink, DatePipe],
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
      const postId = pm.get('postId');
      if (!postId) {
        this.post.set(null);
        this.error.set('Missing post id.');
        return;
      }
      void this.fetchPost(postId);
    });
  }

  async fetchPost(postId: string) {
    this.loading.set(true);
    this.error.set(null);

    try {
      const db = getFirestore();
      const snap = await getDoc(doc(db, 'posts', postId));
      if (!snap.exists()) {
        this.post.set(null);
        this.error.set('Post not found.');
        return;
      }

      const data = snap.data() as PostDoc;
      this.post.set({
        id: snap.id,
        title: (data.title ?? '').trim() || 'Untitled post',
        description: (data.description ?? '').trim(),
        contentHtml: data.content ?? '',
        createdAt: data.created_at,
        mainImgUrl: data.main_img,
        categoryIds: Array.isArray(data.category_ids) ? data.category_ids : [],
        tags: Array.isArray(data.tags) ? data.tags : [],
      });
    } catch (e: any) {
      this.post.set(null);
      this.error.set(e?.message ?? 'Failed to load post.');
    } finally {
      this.loading.set(false);
    }
  }

  asDate(value: unknown): Date | null {
    if (!value) return null;
    if (value instanceof Date) return value;
    const d = new Date(String(value));
    return Number.isNaN(d.getTime()) ? null : d;
  }
}
