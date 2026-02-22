import {Component, OnInit, signal} from '@angular/core';
import { RouterLink } from '@angular/router';
import {collection, getDocs, getFirestore, orderBy, query} from 'firebase/firestore';
import type {CategoryDoc, CategoryItem} from '../../types/category.types';

@Component({
  selector: 'app-not-found-page',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './not-found-page.component.html',
  styleUrl: './not-found-page.component.css',
})
export class NotFoundPageComponent implements OnInit{

  readonly categoryLoading = signal(false);
  readonly error = signal<string | null>(null);
  private readonly _categoryItems = signal<CategoryItem[]>([]);

  private readonly db = getFirestore();


  public get categoryItems(): CategoryItem[] {
    return this._categoryItems().slice(0, 3);
  }

  ngOnInit() {
    this.fetchCategories();
  }

  private async fetchCategories() {

    if (this.categoryLoading()) return;
    this.categoryLoading.set(true);
    this.error.set(null);

    try {
      const colRef = collection(this.db, 'categories');
      const q = query(colRef, orderBy('name', 'asc'));
      const snap = await getDocs(q);

      const byId: Record<string, CategoryItem> = {};
      const mapped = snap.docs
        .map((d) => {
          const data = d.data() as CategoryDoc;
          const name = (data.name ?? '').toString().trim();
          const slug = (data.slug ?? '').toString().trim();

          if (!name || !slug) return null;

          const item = {
            id: d.id,
            title: name,
            href: `/categories/${slug}`,
            description: typeof data.description === 'string' ? data.description : undefined,
            count: typeof data.postCount === 'number' ? data.postCount : undefined,
            countLabel: 'articles',
          } as CategoryItem;

          byId[d.id] = item;
          return item;
        })
        .filter((x): x is CategoryItem => !!x).sort((a, b) => {
          const bv = typeof b.views === 'number' ? b.views : 0;
          const av = typeof a.views === 'number' ? a.views : 0;
          return bv - av;
        }).reverse() as CategoryItem[];

      this._categoryItems.set(mapped);
    } catch (e: any) {
      this.error.set(e?.message ?? 'Failed to load categories.');
    } finally {
      this.categoryLoading.set(false);
    }
  }
}

