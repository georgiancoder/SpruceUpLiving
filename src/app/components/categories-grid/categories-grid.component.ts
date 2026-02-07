import {Component, ChangeDetectionStrategy, Input, signal} from '@angular/core';
import type { CategoryItem } from '../../types/category.types';

@Component({
  selector: 'app-categories-grid',
  standalone: true,
  templateUrl: './categories-grid.component.html',
  styleUrl: './categories-grid.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CategoriesGridComponent {


  @Input() title = 'Categories';
  readonly error = signal<string | null>(null);
  private readonly _items = signal<CategoryItem[]>([]);
  protected readonly loading = signal<any | null>(true);
  @Input() set items(value: CategoryItem[] | null | undefined) {
    this._items.set(Array.isArray(value) ? value : []);
    this.loading.set(false);
  }
  get items(): CategoryItem[] {
    return this._items();
  }
}
