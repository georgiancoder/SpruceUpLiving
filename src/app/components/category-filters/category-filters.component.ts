import { Component, EventEmitter, Input, Output } from '@angular/core';

export type CategoryFilterItem = {
  id: string;
  name: string;
};

@Component({
  selector: 'app-category-filters',
  standalone: true,
  templateUrl: './category-filters.component.html',
})
export class CategoryFiltersComponent {
  @Input() query = '';
  @Output() queryChange = new EventEmitter<string>();

  // optional: pass category options when you hook Firestore up to this page
  @Input() categories: CategoryFilterItem[] = [];

  @Input() selectedIds: string[] = [];
  @Output() selectedIdsChange = new EventEmitter<string[]>();

  @Output() clear = new EventEmitter<void>();

  onQueryInput(value: string) {
    this.queryChange.emit(value);
  }

  toggleCategory(id: string, checked: boolean) {
    const next = new Set(this.selectedIds);
    if (checked) next.add(id);
    else next.delete(id);
    this.selectedIdsChange.emit(Array.from(next));
  }

  onClear() {
    this.clear.emit();
  }

  trackById = (_: number, x: CategoryFilterItem) => x.id;
}

