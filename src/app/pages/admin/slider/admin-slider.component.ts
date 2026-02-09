import { Component, OnInit, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { collection, doc, getDocs, getFirestore, orderBy, query, setDoc } from 'firebase/firestore';

type SliderPostRow = {
  id: string;
  title: string;
  description: string;
  created_at?: string | null;
  main_img?: string | null;
};

@Component({
  selector: 'app-admin-slider-page',
  standalone: true,
  imports: [RouterLink, FormsModule],
  templateUrl: 'admin-silder.component.html',
})
export class AdminSliderPageComponent implements OnInit {
  private readonly db = getFirestore();

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly status = signal<string | null>(null);

  readonly posts = signal<SliderPostRow[]>([]);
  readonly selectedIds = signal<Set<string>>(new Set());

  readonly selectedCount = computed(() => this.selectedIds().size);
  readonly canSubmit = computed(() => !this.loading() && this.selectedCount() > 0);

  ngOnInit(): void {
    void this.fetchPosts();
  }

  async fetchPosts(): Promise<void> {
    if (this.loading()) return;

    this.loading.set(true);
    this.error.set(null);
    this.status.set(null);

    try {
      const q = query(collection(this.db, 'posts'), orderBy('created_at', 'desc'));
      const snap = await getDocs(q);

      const rows: SliderPostRow[] = snap.docs.map((d) => {
        const data = d.data() as any;
        return {
          id: d.id,
          title: String(data?.title ?? ''),
          description: String(data?.description ?? ''),
          created_at: (data?.created_at ?? null) as any,
          main_img: (data?.main_img ?? null) as any,
        };
      });

      this.posts.set(rows);
    } catch (e: any) {
      this.error.set(e?.message ?? 'Failed to fetch posts.');
    } finally {
      this.loading.set(false);
    }
  }

  isSelected(id: string): boolean {
    return this.selectedIds().has(id);
  }

  toggleSelected(id: string, checked: boolean): void {
    const next = new Set(this.selectedIds());
    if (checked) next.add(id);
    else next.delete(id);
    this.selectedIds.set(next);
  }

  async addPostsToMainSlider(): Promise<void> {
    if (!this.canSubmit()) return;

    this.loading.set(true);
    this.error.set(null);
    this.status.set(null);

    try {
      const ids = Array.from(this.selectedIds());
      // stores slider configuration in a single doc for easy consumption by the hero slider
      await setDoc(doc(this.db, 'settings', 'mainSlider'), { postIds: ids }, { merge: true });

      this.status.set(`Added ${ids.length} post(s) to main slider.`);
      this.selectedIds.set(new Set());
    } catch (e: any) {
      this.error.set(e?.message ?? 'Failed to update main slider.');
    } finally {
      this.loading.set(false);
    }
  }
}
