import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

@Component({
  selector: 'app-privacy-page',
  standalone: true,
  templateUrl: './privacy-page.component.html',
  styleUrl: './privacy-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrivacyPageComponent {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);

  constructor() {
    // SSR-safe: Title/Meta work on server and browser.
    this.title.setTitle('Privacy Policy • SpruceUp Living');
    this.meta.updateTag({
      name: 'description',
      content:
        'Read SpruceUp Living’s Privacy Policy describing data collection, cookies, and your choices.',
    });
  }
}

