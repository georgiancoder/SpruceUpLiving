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

  constructor() {
    effect(() => {
      // reset timer when autoplay/paused/slides changes
      void this.autoplayMs;
      void this.paused();
      void this.slides?.length;

      this.stop();
      if (!this.hasSlides() || this.paused() || this.autoplayMs <= 0) return;

      this.timer = window.setInterval(() => this.next(), this.autoplayMs);
    });
  }

  ngOnDestroy(): void {
    this.stop();
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
      return;
    }

    // Simple re-entrancy guard
    if (this.isFading()) return;

    this.isFading.set(true);

    window.setTimeout(() => {
      this.indexSig.set(next);

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
}
