import {Component, ChangeDetectionStrategy, signal, Input, OnInit} from '@angular/core';
import { HeroSliderComponent, type HeroSlide } from '../../components/hero-slider/hero-slider.component';
import {
  LatestPostsComponent,
  type LatestPost
} from '../../components/latest-posts/latest-posts.component';
import {
  CategoriesGridComponent,
} from '../../components/categories-grid/categories-grid.component';
import { NewsletterSignupComponent } from '../../components/newsletter-signup/newsletter-signup.component';
import { AboutSectionComponent } from '../../components/about-section/about-section.component';
import {ContactSectionComponent} from '../../components/contact-section/contact-section.component';
import {collection, getDocs, getFirestore, orderBy, query} from 'firebase/firestore';
import type { CategoryDoc, CategoryItem } from '../../types/category.types';
import { fetchLatestPostsOrderedByCreatedAtDesc } from '../../services/posts.firestore';

type PostWithCategories = LatestPost & {
  category_ids?: string[];
  categories?: CategoryItem[];
};

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [
    HeroSliderComponent,
    LatestPostsComponent,
    CategoriesGridComponent,
    NewsletterSignupComponent,
    AboutSectionComponent,
    ContactSectionComponent
  ],
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomePageComponent implements OnInit {
  protected readonly heroSlides: HeroSlide[] = [
    {
      title: 'Refresh your space, effortlessly',
      subtitle: 'Curated home essentials and simple upgrades that make a big impact.',
      ctaLabel: 'Shop new arrivals',
      ctaHref: '/about',
      imageUrl:
        'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=2000&q=80'
    },
    {
      title: 'Organize smarter',
      subtitle: 'Storage ideas that keep your home calm and clutter-free.',
      ctaLabel: 'Explore tips',
      ctaHref: '/contact',
      imageUrl:
        'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?auto=format&fit=crop&w=2000&q=80'
    },
    {
      title: 'Make it cozy',
      subtitle: 'Textures, lighting, and small touches that change everything.',
      ctaLabel: 'Learn more',
      ctaHref: '/about',
      imageUrl:
        'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=2000&q=80'
    }
  ];

  // fetched from Firestore (enriched with categories)
  readonly latestPosts = signal<PostWithCategories[]>([]);

  private readonly db = getFirestore();

  readonly categoryLoading = signal(false);
  readonly error = signal<string | null>(null);

  private readonly _categoriesById = signal<Record<string, CategoryItem>>({});
  private readonly _categoryItems = signal<CategoryItem[]>([]);

  public get categoryItems(): CategoryItem[] {
    return this._categoryItems().slice(0, 4);
  }

  async ngOnInit() {
    await Promise.all([
      this.fetchCategories(),
      this.fetchLatestPosts(),
    ]);
  }

  private async fetchLatestPosts() {
    try {
      const posts = await fetchLatestPostsOrderedByCreatedAtDesc(this.db, 4);

      const byId = this._categoriesById();
      const enriched = posts.map((p: any) => {
        const ids = Array.isArray(p?.category_ids) ? p.category_ids.map(String) : [];
        const categories = ids.map((id: string) => byId[id]).filter(Boolean).map((c: { title: any; }) => c.title);
        return { ...(p as LatestPost), category_ids: ids, categories } as PostWithCategories;
      });

      this.latestPosts.set(enriched);
    } catch (e: any) {
      this.error.set(e?.message ?? 'Failed to load posts.');
    }
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
            title: name,
            href: `/categories/${slug}`,
            description: typeof data.description === 'string' ? data.description : undefined,
            count: typeof data.postCount === 'number' ? data.postCount : undefined,
            countLabel: 'articles',
          } as CategoryItem;

          byId[d.id] = item;
          return item;
        })
        .filter((x): x is CategoryItem => !!x) as CategoryItem[];

      this._categoriesById.set(byId);
      this._categoryItems.set(mapped);
    } catch (e: any) {
      this.error.set(e?.message ?? 'Failed to load categories.');
    } finally {
      this.categoryLoading.set(false);
    }
  }
}
