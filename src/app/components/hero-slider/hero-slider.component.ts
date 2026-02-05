import {
  Component,
  ChangeDetectionStrategy,
  Input,
  OnDestroy,
  signal,
  computed,
  effect
} from '@angular/core';

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
  templateUrl: './hero-slider.component.html',
  styleUrl: './hero-slider.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HeroSliderComponent implements OnDestroy {
  @Input({ required: true }) slides: HeroSlide[] = [];
  @Input() autoplayMs = 6000;

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
    this.indexSig.set(next);
  }

  protected prev() {
    this.goTo(this.indexSig() - 1);
  }

  protected next() {
    this.goTo(this.indexSig() + 1);
  }

  private stop() {
    if (this.timer != null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
