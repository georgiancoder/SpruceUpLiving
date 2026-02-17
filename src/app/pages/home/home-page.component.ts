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
import {collection, getDocs, getFirestore, orderBy, query, doc, getDoc} from 'firebase/firestore';
import type { CategoryDoc, CategoryItem } from '../../types/category.types';
import { fetchLatestPostsOrderedByCreatedAtDesc } from '../../services/posts.firestore';
import {
  estimateReadingMinutesFromPost,
} from '../../utils/reading-time';

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
  protected readonly heroSlides = signal<HeroSlide[]>([]);

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
      this.fetchMainSlider(),
      this.fetchCategories(),
      this.fetchLatestPosts(),
    ]);
  }

  private async fetchMainSlider() {
    try {
      // Fetch top 3 most popular posts by views
      const qPopular = query(
        collection(this.db, 'posts'),
        orderBy('views', 'desc'),
      );

      const snap = await getDocs(qPopular);

      const top3 = snap.docs.slice(0, 3).map((d) => ({ id: d.id, ...d.data() }));

      const slides: HeroSlide[] = top3
        .map((post: any) => {
          const id = String(post.id);
          const title = (post?.title ?? '').toString().trim();
          const subtitle = (post?.description ?? '').toString().trim();

          const category_ids = Array.isArray(post.category_ids) ? post.category_ids : (post.category_ids ? [post.category_ids] : []);
          const categories = category_ids
            .map((cid: any) => String(cid))
            .map((cid: string) => this._categoryItems().find((c) => c.id === cid)?.title)
            .filter(Boolean) as string[];

          const imageUrl = (post?.main_img ?? '').toString().trim();

          const slug = (post?.slug ?? '').toString().trim();
          const defaultHref = slug ? `/#/post/${slug}` : `/#/post/${id}`;

          const tags = Array.isArray(post?.tags)
            ? post.tags.map((t: any) => String(t).trim()).filter(Boolean)
            : [];

          if (!title || !imageUrl) return null;

          const readMinutes = estimateReadingMinutesFromPost(post);

          return {
            title,
            subtitle,
            ctaLabel: 'Read more',
            ctaHref: defaultHref,
            imageUrl,
            tags,
            categories,
            postId: id,
            readMinutes,
          } as any as HeroSlide;
        })
        .filter((x: HeroSlide | null): x is HeroSlide => !!x);

      this.heroSlides.set(slides);
    } catch (e: any) {
      this.error.set(e?.message ?? 'Failed to load main slider.');
      this.heroSlides.set([]);
    }
  }

  private async fetchLatestPosts() {
    try {
      const posts = await fetchLatestPostsOrderedByCreatedAtDesc(this.db, 4);

      const byId = this._categoriesById();
      const enriched = posts.map((p: any) => {
        const ids = Array.isArray(p?.category_ids) ? p.category_ids.map(String) : [];
        const categories = ids.map((id: string) => byId[id]).filter(Boolean).map((c: { title: any; }) => c.title);
        return { ...(p as LatestPost), category_ids: ids, categories, id: p.id } as PostWithCategories;
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
            id: d.id,
            title: name,
            href: `#/categories/${slug}`,
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

      this._categoriesById.set(byId);
      this._categoryItems.set(mapped);
    } catch (e: any) {
      this.error.set(e?.message ?? 'Failed to load categories.');
    } finally {
      this.categoryLoading.set(false);
    }
  }
}
