import { Component, ChangeDetectionStrategy } from '@angular/core';
import { HeroSliderComponent, type HeroSlide } from '../../components/hero-slider/hero-slider.component';
import {
  LatestPostsComponent,
  type LatestPost
} from '../../components/latest-posts/latest-posts.component';
import {
  CategoriesGridComponent,
  type CategoryItem
} from '../../components/categories-grid/categories-grid.component';
import { NewsletterSignupComponent } from '../../components/newsletter-signup/newsletter-signup.component';
import { AboutSectionComponent } from '../../components/about-section/about-section.component';
import {ContactSectionComponent} from '../../components/contact-section/contact-section.component';

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
export class HomePageComponent {
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

  protected readonly latestPosts: LatestPost[] = [
    {
      title: '5 quick wins for a cleaner entryway',
      excerpt: 'Simple hooks, trays, and routines that reduce clutter fast.',
      href: '/posts/entryway-quick-wins',
      dateLabel: 'Feb 2026',
      tag: 'Organization'
    },
    {
      title: 'Lighting swaps that instantly feel cozier',
      excerpt: 'Warm bulbs, layered lamps, and placement tips for calm evenings.',
      href: '/posts/cozy-lighting-swaps',
      dateLabel: 'Jan 2026',
      tag: 'Comfort'
    },
    {
      title: 'Small-space storage ideas that actually work',
      excerpt: 'Vertical space, under-bed zones, and flexible organizers.',
      href: '/posts/small-space-storage',
      dateLabel: 'Dec 2025',
      tag: 'Storage'
    },
    {
      title: 'Weekend reset: a 30-minute room refresh',
      excerpt: 'A quick checklist to make your space feel new without a big clean.',
      href: '/posts/weekend-reset-30-min',
      dateLabel: 'Nov 2025',
      tag: 'Routines'
    }
  ];

  protected readonly categories: CategoryItem[] = [
    {
      title: 'Home Improvement',
      description: 'Weekend projects, repairs, and simple upgrades you can tackle yourself.',
      href: '/categories/home-improvement',
      count: 24,
      countLabel: 'articles'
    },
    {
      title: 'Organization',
      description: 'Storage, routines, and declutter ideas.',
      href: '/categories/organization',
      count: 18,
      countLabel: 'articles'
    },
    {
      title: 'Comfort',
      description: 'Cozy lighting, textures, and mood.',
      href: '/categories/comfort',
      count: 12,
      countLabel: 'articles'
    },
    {
      title: 'Decor',
      description: 'Small upgrades with big impact.',
      href: '/categories/decor',
      count: 16,
      countLabel: 'articles'
    }
  ];
}
