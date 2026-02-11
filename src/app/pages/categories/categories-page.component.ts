import {Component, OnInit, computed, signal, inject, DestroyRef} from '@angular/core';
import { CategoriesHeaderComponent } from '../../components/categories-header/categories-header.component';
import { CategoryFiltersComponent } from '../../components/category-filters/category-filters.component';
import { PostsGridComponent, type PostGridItem } from '../../components/posts-grid/posts-grid.component';
import { CategoriesSidebarComponent } from '../../components/categories-sidebar/categories-sidebar.component';
import { fetchCategoriesOrderedByName } from '../../services/categories.firestore';
import { getFirestore } from 'firebase/firestore';
import { CategoryItem } from '../../types/category.types';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';


@Component({
  selector: 'app-categories-page',
  standalone: true,
  imports: [
    CategoriesHeaderComponent,
    CategoryFiltersComponent,
    PostsGridComponent,
    CategoriesSidebarComponent,
  ],
  templateUrl: './categories-page.component.html',
  styleUrl: './categories-page.component.css',
})
export class CategoriesPageComponent implements OnInit {
  private readonly db = getFirestore();
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  // NOTE: wire these into your real categories fetch when ready
  readonly query = signal('');
  readonly selectedCategoryIds = signal<string[]>([]);
  readonly totalPosts = signal<number>(0);
  // Temporary local data until Firestore wiring (keeps UI working)
  readonly posts = signal<PostGridItem[]>([
    {
      id: 'p1',
      title: 'How to Refresh Your Living Room in a Weekend',
      description: 'Quick wins to make your space feel brand new without a full remodel.',
      created_at: new Date().toISOString(),
      main_img: '',
      category_ids: ['home-improvement'],
      tags: ['tag1'],
    },
    {
      id: 'p2',
      title: 'Deep Cleaning Checklist for Busy Weeks',
      description: 'A simple, repeatable routine you can finish in under 60 minutes.',
      created_at: new Date(Date.now() - 86400000).toISOString(),
      main_img: '',
      category_ids: ['cleaning'],
      tags: ['tag2'],
    },
    {
      id: 'p3',
      title: 'Small Apartment Organization Ideas',
      description: 'Storage hacks and layout tips to reduce clutter fast.',
      created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
      main_img: '',
      category_ids: ['organization'],
      tags: ['tag3'],
    },
  ]);

  readonly selectedCategoryNames = signal<string[]>([]);
  readonly categories = signal<CategoryItem[]>([]);

  readonly filteredPosts = computed(() => {
    const q = this.query().trim().toLowerCase();
    const selected = new Set(this.selectedCategoryIds());

    return this.posts().filter(p => {
      const matchesQuery =
        !q ||
        p.title.toLowerCase().includes(q) ||
        (p.description ?? '').toLowerCase().includes(q);

      const matchesCats =
        selected.size === 0 || (p.category_ids ?? []).some(id => selected.has(id));

      return matchesQuery && matchesCats;
    });
  });

  setHeaderText(cats: CategoryItem[]) {
    this.totalPosts.set(cats.reduce((sum, c) => sum + (typeof c.postCount === 'number' ? c.postCount : 0), 0));
    const selectedCatNames = cats.filter(c => this.selectedCategoryIds().includes(c.id)).map(c => c.title);
    this.selectedCategoryNames.set(selectedCatNames.length ? selectedCatNames : cats.map(c => c.title));
  }

  async ngOnInit() {
    const cats = await fetchCategoriesOrderedByName(this.db);
    this.categories.set(
      cats.map((c) => ({
        id: c.id,
        postCount: typeof (c as any).postCount === 'number' ? (c as any).postCount : undefined,
        title: c.title,
        href: c.href,
        slug: c.slug,
      })),
    );

    // If /categories/:categoryId is present, preselect it
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((pm) => {
      const categorySlugs = (pm.get('categoryId')?.trim() ?? '').split('_');
      if (!categorySlugs) {
        this.selectedCategoryIds.set([]);
        this.setHeaderText(this.categories());
        return;
      }
      const categoryIds = this.categories().filter((c) => c.slug && categorySlugs.includes(c.slug));
      this.selectedCategoryIds.set(categoryIds.length ? [...categoryIds.map(c => c.id)] : []);
      this.setHeaderText(categoryIds.length ? categoryIds : this.categories());
    });
  }

  onQueryChange(q: string) {
    this.query.set(q);
  }

  onSelectedIdsChange(ids: string[]) {
    this.selectedCategoryIds.set(ids);
    this.setHeaderText(this.categories().filter(c => this.selectedCategoryIds().includes(c.id)));
  }

  onClearFilters() {
    this.query.set('');
    this.selectedCategoryIds.set([]);
  }
}
