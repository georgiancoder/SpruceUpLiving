import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

@Component({
  selector: 'app-terms-page',
  standalone: true,
  templateUrl: './terms-page.component.html',
  styleUrl: './terms-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TermsPageComponent {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);

  constructor() {
    // SSR-safe: Title/Meta are supported during server rendering.
    this.title.setTitle('Terms of Service • SpruceUp Living');
    this.meta.updateTag({
      name: 'description',
      content:
        'Read SpruceUp Living’s Terms of Service, including disclaimers, acceptable use, and limitations of liability.',
    });
  }
}

