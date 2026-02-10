import {
  Component,
  ChangeDetectionStrategy,
  Input,
  OnDestroy,
  signal,
  computed,
  effect
} from '@angular/core';
import {NgClass, NgFor, NgIf} from '@angular/common';

export type HeroSlide = {
  title: string;
  subtitle?: string;
  ctaLabel?: string;
  ctaHref?: string;
  imageUrl?: string;
  tags?: string[];
};

@Component({
  selector: 'app-hero-slider',
  standalone: true,
  imports: [NgIf, NgFor, NgClass],
  templateUrl: './hero-slider.component.html',
  styleUrl: './hero-slider.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HeroSliderComponent implements OnDestroy {
  @Input({ required: true }) slides: HeroSlide[] = [];
  @Input() popularPosts: HeroSlide[] | null = null;
  @Input() autoplayMs = 6000;
  @Input() fadeMs = 220;

  private readonly indexSig = signal(0);
  protected readonly index = this.indexSig.asReadonly();

  protected readonly hasSlides = computed(() => (this.slides?.length ?? 0) > 0);
  protected readonly activeSlide = computed(() => {
    const s = this.slides ?? [];
    if (!s.length) return null;
    const i = ((this.indexSig() % s.length) + s.length) % s.length;
    return s[i] ?? null;
  });

  private paused = signal(false);
  private timer: number | null = null;

  protected readonly isFading = signal(false);

  protected readonly progress = signal(0); // 0..1
  private rafId: number | null = null;

  protected readonly activeSidebarIndex = computed(() => {
    const items = this.popularPostsResolved();
    if (!items.length) return -1;

    // Find the sidebar row that maps to the active slide index
    const slideIdx = this.indexSig();
    return items.findIndex((item, i) => this.sidebarSlideIndex(item, i) === slideIdx);
  });

  constructor() {
    effect(() => {
      // reset timer when autoplay/paused/slides changes
      void this.autoplayMs;
      void this.paused();
      void this.slides?.length;

      this.stop();
      this.stopProgress();

      // reset progress when slides/paused/autoplay/index changes
      void this.indexSig();
      this.progress.set(0);

      if (!this.hasSlides() || this.paused() || this.autoplayMs <= 0) return;

      this.startProgress();
      this.timer = window.setInterval(() => this.next(), this.autoplayMs);
    });
  }

  ngOnDestroy(): void {
    this.stop();
    this.stopProgress();
  }

  protected setPaused(v: boolean) {
    this.paused.set(v);
  }

  protected goTo(i: number) {
    const n = this.slides?.length ?? 0;
    if (!n) return;
    const next = ((i % n) + n) % n;

    // Avoid re-animating when clicking the active dot
    if (next === this.indexSig()) return;

    this.progress.set(0);
    this.fadeToIndex(next);
  }

  protected prev() {
    this.goTo(this.indexSig() - 1);
  }

  protected next() {
    this.goTo(this.indexSig() + 1);
  }

  private fadeToIndex(next: number) {
    // If fade disabled, switch immediately
    if (this.fadeMs <= 0) {
      this.indexSig.set(next);
      this.progress.set(0);
      return;
    }

    // Simple re-entrancy guard
    if (this.isFading()) return;

    this.isFading.set(true);

    window.setTimeout(() => {
      this.indexSig.set(next);
      this.progress.set(0);

      window.setTimeout(() => {
        this.isFading.set(false);
      }, this.fadeMs);
    }, this.fadeMs);
  }

  private stop() {
    if (this.timer != null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private startProgress() {
    const start = performance.now();

    const tick = (now: number) => {
      // stop conditions (keeps bar from running while paused/disabled)
      if (!this.hasSlides() || this.paused() || this.autoplayMs <= 0) {
        this.stopProgress();
        return;
      }

      const t = Math.min(1, Math.max(0, (now - start) / this.autoplayMs));
      this.progress.set(t);

      if (t < 1) this.rafId = requestAnimationFrame(tick);
    };

    this.rafId = requestAnimationFrame(tick);
  }

  private stopProgress() {
    if (this.rafId != null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  protected readonly popularPostsResolved = computed(() => {
    const p = this.popularPosts;
    if (p && p.length) return p;
    return this.slides ?? [];
  });

  /** Map a sidebar item -> index in `slides` (works even if popularPosts is a different array instance). */
  protected sidebarSlideIndex(item: HeroSlide, fallbackIndex: number): number {
    // Fast path when sidebar is literally slides (default)
    const direct = this.slides?.[fallbackIndex];
    if (direct === item) return fallbackIndex;

    // Best-effort: match by href, then by title (customize if you have stable IDs)
    const byHref = item.ctaHref
      ? (this.slides ?? []).findIndex(s => s.ctaHref && s.ctaHref === item.ctaHref)
      : -1;
    if (byHref >= 0) return byHref;

    const byTitle = item.title
      ? (this.slides ?? []).findIndex(s => s.title === item.title)
      : -1;
    return byTitle >= 0 ? byTitle : fallbackIndex;
  }

  protected sidebarIsActive(item: HeroSlide, fallbackIndex: number): boolean {
    return this.sidebarSlideIndex(item, fallbackIndex) === this.indexSig();
  }
}
