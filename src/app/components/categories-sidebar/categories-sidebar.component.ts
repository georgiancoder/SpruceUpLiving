import { Component, EventEmitter, Input, Output, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CategoryItem } from '../../types/category.types';
import {
  addNewsletterSubscriberEmail,
  fetchExistingEmails,
  isValidNewsletterEmail,
  normalizeNewsletterEmail,
} from '../../services/newsletter.firestore';

type LastReadPost = {
  id: string;
  title: string;
  mainImgUrl?: string | null;
  readAt?: string | null;
};

type CategoryWithViews = CategoryItem & { views?: number };

@Component({
  selector: 'app-categories-sidebar',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './categories-sidebar.component.html',
})
export class CategoriesSidebarComponent {
  @Input({ required: true }) categories: CategoryItem[] = [];

  @Input() selectedIds: string[] = [];
  @Output() selectedIdsChange = new EventEmitter<string[]>();

  @Output() clear = new EventEmitter<void>();

  readonly localQuery = signal('');

  readonly lastReadPost = signal<LastReadPost | null>(null);

  readonly popularCategories = computed(() => {
    const list = (this.categories ?? []) as CategoryWithViews[];
    return [...list]
      .sort((a, b) => {
        const bv = typeof b.views === 'number' ? b.views : 0;
        const av = typeof a.views === 'number' ? a.views : 0;
        return bv - av;
      })
      .slice(0, 4).reverse();
  });

  // newsletter
  readonly newsletterEmail = signal('');
  readonly newsletterSending = signal(false);
  readonly newsletterSuccess = signal<string | null>(null);
  readonly newsletterError = signal<string | null>(null);

  private existingNewsletterEmails: Set<string> | null = null;
  private existingEmailsLoading: Promise<void> | null = null;

  constructor() {
    this.loadLastReadPostFromStorage();
    void this.ensureExistingNewsletterEmailsLoaded();
  }

  private async ensureExistingNewsletterEmailsLoaded() {
    if (this.existingNewsletterEmails) return;
    if (this.existingEmailsLoading) return this.existingEmailsLoading;

    this.existingEmailsLoading = (async () => {
      try {
        this.existingNewsletterEmails = await fetchExistingEmails();
      } catch {
        this.existingNewsletterEmails = new Set(); // best-effort; still allow subscribe
      } finally {
        this.existingEmailsLoading = null;
      }
    })();

    return this.existingEmailsLoading;
  }

  private loadLastReadPostFromStorage() {
    try {
      const raw = localStorage.getItem('spruce:lastReadPost');
      if (!raw) return;

      const parsed = JSON.parse(raw) as Partial<LastReadPost> | null;
      if (!parsed?.id || !parsed?.title) return;

      this.lastReadPost.set({
        id: String(parsed.id),
        title: String(parsed.title),
        mainImgUrl: parsed.mainImgUrl ?? null,
        readAt: parsed.readAt ?? null,
      });
    } catch {
      // ignore storage/JSON errors
    }
  }

  getLastReadLabel(readAt?: string | null) {
    if (!readAt) return '';
    const d = new Date(readAt);
    return Number.isNaN(d.getTime()) ? '' : d.toLocaleString();
  }

  readonly filteredCategories = computed(() => {
    const q = this.localQuery().trim().toLowerCase();
    if (!q) return this.categories;
    return this.categories.filter((c) => c.title.toLowerCase().includes(q));
  });

  isSelected(id: string) {
    return this.selectedIds?.includes(id);
  }

  toggle(id: string, checked: boolean) {
    const next = new Set(this.selectedIds ?? []);
    if (checked) next.add(id);
    else next.delete(id);
    this.selectedIdsChange.emit(Array.from(next));
  }

  selectOnly(id: string) {
    this.selectedIdsChange.emit([id]);
  }

  onClear() {
    this.clear.emit();
  }

  onNewsletterInput(v: string) {
    this.newsletterEmail.set(v);
    this.newsletterError.set(null);
    this.newsletterSuccess.set(null);
  }

  async submitNewsletter() {
    if (this.newsletterSending()) return;

    const raw = this.newsletterEmail();
    if (!raw?.trim()) {
      this.newsletterError.set('Email is required.');
      return;
    }
    if (!isValidNewsletterEmail(raw)) {
      this.newsletterError.set('Please enter a valid email.');
      return;
    }

    const normalized = normalizeNewsletterEmail(raw);

    this.newsletterSending.set(true);
    this.newsletterError.set(null);
    this.newsletterSuccess.set(null);

    try {
      await this.ensureExistingNewsletterEmailsLoaded();
      if (this.existingNewsletterEmails?.has(normalized)) {
        this.newsletterError.set('This email is already subscribed.');
        return;
      }

      await addNewsletterSubscriberEmail({
        email: normalized,
        source: 'categories-sidebar',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
        pageUrl: typeof location !== 'undefined' ? location.href : null,
      });

      // update local cache
      if (!this.existingNewsletterEmails) this.existingNewsletterEmails = new Set();
      this.existingNewsletterEmails.add(normalized);

      this.newsletterEmail.set('');
      this.newsletterSuccess.set('Thanks! You’re subscribed.');
    } catch (e: any) {
      this.newsletterError.set(e?.message ?? 'Failed to subscribe. Please try again.');
    } finally {
      this.newsletterSending.set(false);
    }
  }
}
