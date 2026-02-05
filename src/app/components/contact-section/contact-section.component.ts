import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'app-contact-section',
  standalone: true,
  templateUrl: './contact-section.component.html',
  styleUrl: './contact-section.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ContactSectionComponent {
  @Input() title = 'Contact';
  @Input() subtitle?: string;

  @Input() email?: string;
  @Input() phone?: string;
  @Input() address?: string;

  @Input() ctaLabel?: string;
  @Input() ctaHref?: string;
}
