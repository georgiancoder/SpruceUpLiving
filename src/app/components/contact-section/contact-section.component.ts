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

  sending = false;
  sent = false;
  errorMsg: string | null = null;

  private readonly endpoint =
    'https://sendemail-mfofpvudma-uc.a.run.app';

  async onSubmit(form: NgForm) {
    if (!form.valid || this.sending) return;

    this.sending = true;
    this.sent = false;
    this.errorMsg = null;

    const name = (form.value?.name ?? '').toString().trim();
    const from = (form.value?.from ?? '').toString().trim();
    const subject = (form.value?.subject ?? '').toString().trim();
    const message = (form.value?.message ?? '').toString().trim();

    try {
      const res = await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Adjust keys if your CF expects different field names
        body: JSON.stringify({
          name,
          email: from,
          subject: subject || 'Contact form message',
          message
        })
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text || `Request failed (${res.status})`);
      }

      this.sent = true;
      form.resetForm();
    } catch (e) {
      this.errorMsg = e instanceof Error ? e.message : 'Failed to send message';
    } finally {
      this.sending = false;
    }
  }
}
