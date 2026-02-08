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

  // fetched from Firestore
  readonly latestPosts = signal<LatestPost[]>([]);

  private readonly db = getFirestore();

  readonly categoryLoading = signal(false);
  readonly error = signal<string | null>(null);

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
      this.latestPosts.set(await fetchLatestPostsOrderedByCreatedAtDesc(this.db, 4));
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

      const mapped = snap.docs
        .map((d) => {
          const data = d.data() as CategoryDoc;
          const name = (data.name ?? '').toString().trim();
          const slug = (data.slug ?? '').toString().trim();

          if (!name || !slug) return null;

          return {
            title: name,
            href: `/categories/${slug}`,
            description: typeof data.description === 'string' ? data.description : undefined,
            count: typeof data.postCount === 'number' ? data.postCount : undefined,
            countLabel: 'articles',
          } as CategoryItem;
        })
        .filter((x): x is CategoryItem => !!x) as CategoryItem[];

      this._categoryItems.set(mapped);
    } catch (e: any) {
      this.error.set(e?.message ?? 'Failed to load categories.');
    } finally {
      this.categoryLoading.set(false);
    }
  }
}
