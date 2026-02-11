import {Component, OnInit, computed, signal, inject, DestroyRef} from '@angular/core';
import { CategoriesHeaderComponent } from '../../components/categories-header/categories-header.component';
import { CategoryFiltersComponent } from '../../components/category-filters/category-filters.component';
import { PostsGridComponent, type PostGridItem } from '../../components/posts-grid/posts-grid.component';
import { CategoriesSidebarComponent } from '../../components/categories-sidebar/categories-sidebar.component';
import { fetchCategoriesOrderedByName } from '../../services/categories.firestore';
import { getFirestore, collection, getDocs, orderBy, query as fsQuery } from 'firebase/firestore';
import { CategoryItem } from '../../types/category.types';
import { ActivatedRoute, Router } from '@angular/router';
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
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly query = signal('');
  readonly selectedCategoryIds = signal<string[]>([]);
  readonly totalPosts = signal<number>(0);

  readonly postsLoading = signal(false);
  readonly postsError = signal<string | null>(null);

  // Firestore-backed
  readonly posts = signal<PostGridItem[]>([]);

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

  async fetchPosts() {
    this.postsLoading.set(true);
    this.postsError.set(null);

    try {
      const postsCol = collection(this.db, 'posts');
      const q = fsQuery(postsCol, orderBy('created_at', 'desc'));
      const snap = await getDocs(q);

      const items: PostGridItem[] = snap.docs.map((d) => {
        const data = d.data() as any;
        return {
          id: d.id,
          title: String(data.title ?? ''),
          description: String(data.description ?? ''),
          created_at: String(data.created_at ?? ''),
          main_img: String(data.main_img ?? ''),
          category_ids: Array.isArray(data.category_ids) ? data.category_ids.map(String) : [],
          tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
        };
      });

      this.posts.set(items);
    } catch (e: any) {
      this.postsError.set(e?.message ?? 'Failed to fetch posts.');
      this.posts.set([]);
    } finally {
      this.postsLoading.set(false);
    }
  }

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

    await this.fetchPosts();

    // If /categories/:categoryId is present, preselect it
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((pm) => {
      const raw = (pm.get('categoryId')?.trim() ?? '');
      const categorySlugs = raw ? raw.split('_') : [];

      if (categorySlugs.length === 0) {
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

    // Update URL to reflect current selection: /categories or /categories/:slug[_slug...]
    const slugs = this.categories()
      .filter((c) => ids.includes(c.id))
      .map((c) => (c.slug ?? '').trim())
      .filter(Boolean);

    if (slugs.length === 0) {
      this.router.navigate(['/categories']);
      return;
    }

    this.router.navigate(['/categories', slugs.join('_')]);
  }

  onClearFilters() {
    this.query.set('');
    this.selectedCategoryIds.set([]);
    this.setHeaderText(this.categories());
    this.router.navigate(['/categories']);
  }
}
