import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'app-about-section',
  standalone: true,
  templateUrl: './about-section.component.html',
  styleUrl: './about-section.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AboutSectionComponent {
  @Input() title = 'About';
  @Input() subtitle?: string;
  @Input() body?: string;

  @Input() ctaLabel?: string;
  @Input() ctaHref?: string;
}
