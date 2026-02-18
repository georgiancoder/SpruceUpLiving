import { Component, OnChanges, SimpleChanges, input, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { collection, getDocs, getFirestore, limit, orderBy, query, where } from 'firebase/firestore';

type SuggestedPostDoc = {
  title?: string;
  description?: string;
  created_at?: string | Date;
  main_img?: string;
  category_ids?: string[];
};

type SuggestedPostVM = {
  id: string;
  title: string;
  description: string;
  createdAt?: string | Date;
  mainImgUrl?: string;
};

type SuggestedContextPost = {
  id: string;
  categoryIds?: string[];
};

@Component({
  selector: 'app-suggested-posts',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './suggested-posts.component.html',
  styleUrl: './suggested-posts.component.css',
})
export class SuggestedPostsComponent implements OnChanges {
  post = input.required<SuggestedContextPost>();

  loading = signal(false);
  error = signal<string | null>(null);
  posts = signal<SuggestedPostVM[]>([]);

  private readonly db = getFirestore();

  hasAny = computed(() => this.posts().length > 0);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['post']) {
      void this.fetchSuggested();
    }
  }

  private async fetchSuggested() {
    const ctx = this.post();
    const currentId = ctx.id;
    const cats = (ctx.categoryIds ?? []).filter(Boolean);

    this.loading.set(true);
    this.error.set(null);

    try {
      const col = collection(this.db, 'posts');
      if (cats.length > 0) {
        const q = query(
          col,
          where('category_ids', 'array-contains-any', cats.slice(0, 10)),
          orderBy('created_at', 'desc'),
          limit(12),
        );

        const snap = await getDocs(q);
        console.log(snap);
        const mapped = snap.docs
          .filter((d) => d.id !== currentId)
          .map((d) => {
            const data = d.data() as SuggestedPostDoc;
            return {
              id: d.id,
              title: (data.title ?? '').trim() || 'Untitled post',
              description: (data.description ?? '').trim(),
              createdAt: data.created_at,
              mainImgUrl: data.main_img,
            } satisfies SuggestedPostVM;
          })
          .slice(0, 6);
        this.posts.set(mapped);
        return;
      }

      const q = query(col, orderBy('created_at', 'desc'), limit(12));
      const snap = await getDocs(q);
      const mapped = snap.docs
        .filter((d) => d.id !== currentId)
        .map((d) => {
          const data = d.data() as SuggestedPostDoc;
          return {
            id: d.id,
            title: (data.title ?? '').trim() || 'Untitled post',
            description: (data.description ?? '').trim(),
            createdAt: data.created_at,
            mainImgUrl: data.main_img,
          } satisfies SuggestedPostVM;
        })
        .slice(0, 6);

      this.posts.set(mapped);
    } catch (e: any) {
      this.posts.set([]);
      this.error.set(e?.message ?? 'Failed to load suggested posts.');
    } finally {
      this.loading.set(false);
    }
  }
}
