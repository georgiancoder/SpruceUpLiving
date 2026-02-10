import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';

@Component({
  selector: 'app-contact-section',
  standalone: true,
  imports: [FormsModule],
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

  onSubmit(form: NgForm) {
    if (!form.valid) return;

    const to = 'info@spruceupliving.com';

    const name = (form.value?.name ?? '').toString().trim();
    const from = (form.value?.from ?? '').toString().trim();
    const subject = (form.value?.subject ?? '').toString().trim();
    const message = (form.value?.message ?? '').toString().trim();

    const mailSubject = subject || 'Contact form message';
    const bodyLines = [
      `Name: ${name}`,
      `Email: ${from}`,
      '',
      message
    ];

    const mailto =
      `mailto:${encodeURIComponent(to)}` +
      `?subject=${encodeURIComponent(mailSubject)}` +
      `&body=${encodeURIComponent(bodyLines.join('\n'))}`;

    window.location.href = mailto;
  }
}
