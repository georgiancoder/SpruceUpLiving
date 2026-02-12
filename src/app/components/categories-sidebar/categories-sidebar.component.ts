import { Component, EventEmitter, Input, Output, computed, signal } from '@angular/core';
import {CategoryItem} from '../../types/category.types';

@Component({
  selector: 'app-categories-sidebar',
  standalone: true,
  templateUrl: './categories-sidebar.component.html',
})
export class CategoriesSidebarComponent {
  @Input({ required: true }) categories: CategoryItem[] = [];

  @Input() selectedIds: string[] = [];
  @Output() selectedIdsChange = new EventEmitter<string[]>();

  @Output() clear = new EventEmitter<void>();

  readonly localQuery = signal('');

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

