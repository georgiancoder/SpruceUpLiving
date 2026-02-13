import { Component, EventEmitter, Input, Output, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CategoryItem } from '../../types/category.types';

type LastReadPost = {
  id: string;
  title: string;
  mainImgUrl?: string | null;
  readAt?: string | null;
};

@Component({
  selector: 'app-categories-sidebar',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './categories-sidebar.component.html',
})
export class CategoriesSidebarComponent {
  @Input({ required: true }) categories: CategoryItem[] = [];

  @Input() selectedIds: string[] = [];
  @Output() selectedIdsChange = new EventEmitter<string[]>();

  @Output() clear = new EventEmitter<void>();

  readonly localQuery = signal('');

  readonly lastReadPost = signal<LastReadPost | null>(null);

  constructor() {
    this.loadLastReadPostFromStorage();
  }

  private loadLastReadPostFromStorage() {
    try {
      const raw = localStorage.getItem('spruce:lastReadPost');
      if (!raw) return;

      const parsed = JSON.parse(raw) as Partial<LastReadPost> | null;
      if (!parsed?.id || !parsed?.title) return;

      this.lastReadPost.set({
        id: String(parsed.id),
        title: String(parsed.title),
        mainImgUrl: parsed.mainImgUrl ?? null,
        readAt: parsed.readAt ?? null,
      });
    } catch {
      // ignore storage/JSON errors
    }
  }

  getLastReadLabel(readAt?: string | null) {
    if (!readAt) return '';
    const d = new Date(readAt);
    return Number.isNaN(d.getTime()) ? '' : d.toLocaleString();
  }

  readonly filteredCategories = computed(() => {
    const q = this.localQuery().trim().toLowerCase();
    if (!q) return this.categories;
    return this.categories.filter(c => c.title.toLowerCase().includes(q));
  });

  isSelected(id: string) {
    return this.selectedIds?.includes(id);
  }

  toggle(id: string, checked: boolean) {
    const next = new Set(this.selectedIds ?? []);
    if (checked) next.add(id);
    else next.delete(id);
    this.selectedIdsChange.emit(Array.from(next));
  }

  onClear() {
    this.clear.emit();
  }
}
