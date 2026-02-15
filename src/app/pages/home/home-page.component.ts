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
import {collection, getDocs, getFirestore, orderBy, query, doc, getDoc, documentId, where} from 'firebase/firestore';
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
      const ref = doc(this.db, 'settings', 'mainSlider');
      const snap = await getDoc(ref);

      const data = snap.exists() ? (snap.data() as any) : null;

      const postIds: string[] = Array.isArray(data?.postIds)
        ? data.postIds.map((x: any) => String(x)).filter(Boolean)
        : [];

      // Optional per-slide overrides (array aligned to postIds by index)
      const overrides: any[] = Array.isArray(data?.slides) ? data.slides : [];

      if (!postIds.length) {
        this.heroSlides.set([]);
        return;
      }
      // Fetch posts by IDs (Firestore "in" supports max 10 per query); chunk to be safe
      const postsById = new Map<string, any>();
      const chunkSize = 10;

      for (let i = 0; i < postIds.length; i += chunkSize) {
        const chunk = postIds.slice(i, i + chunkSize);
        const q = query(collection(this.db, 'posts'), where(documentId(), 'in', chunk));
        const s = await getDocs(q);
        s.forEach((d) => postsById.set(d.id, { id: d.id, ...d.data() }));
      }

      const slides: HeroSlide[] = postIds
        .map((id, idx) => {
          const post = postsById.get(id);
          if (!post) return null;
          const o = overrides[idx] ?? {};
          const title = (o?.title ?? post?.title ?? '').toString().trim();
          const subtitle = (o?.subtitle ?? post?.description ?? '').toString().trim();
          const category_ids = Array.isArray(post.category_ids) ? post.category_ids : [post.category_ids];
          const categories = category_ids.map((id:string) => this._categoryItems().find(c => c.id === id)?.title);
          // try common image fields; allow override
          const imageUrl = (o?.imageUrl ?? post?.main_img ?? '')
            .toString()
            .trim();

          // Default CTA points to post detail; allow override
          const slug = (post?.slug ?? '').toString().trim();
          const defaultHref = slug ? `/#/post/${slug}` : `/#/post/${id}`;
          const ctaHref = (o?.ctaHref ?? defaultHref).toString().trim();
          const ctaLabel = (o?.ctaLabel ?? 'Read more').toString().trim();
          const tags = Array.isArray(post?.tags) ? post.tags.map((t: any) => String(t).trim()).filter(Boolean) : [];

          if (!title || !imageUrl) return null;

          const readMinutes = estimateReadingMinutesFromPost(post);

          return {
            title,
            subtitle,
            ctaLabel,
            ctaHref,
            imageUrl,
            tags,
            categories,
            postId: id,
            // extra display data for UI (optional)
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
