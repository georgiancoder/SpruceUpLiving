import {ChangeDetectionStrategy, Component, Input, signal} from '@angular/core';
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
  successMsg: string | null = null;

  readonly fadingSuccess = signal<boolean>(false);
  readonly fadingError = signal<boolean>(false);

  private hideSuccessTimer: ReturnType<typeof setTimeout> | null = null;
  private hideErrorTimer: ReturnType<typeof setTimeout> | null = null;

  private readonly endpoint =
    'https://sendemail-mfofpvudma-uc.a.run.app';

  private clearMessageTimers() {
    if (this.hideSuccessTimer) clearTimeout(this.hideSuccessTimer);
    if (this.hideErrorTimer) clearTimeout(this.hideErrorTimer);
    this.hideSuccessTimer = null;
    this.hideErrorTimer = null;
  }

  private scheduleSuccessHide(totalMs = 3_000, fadeMs = 300) {
    this.fadingSuccess.set(false);
    if (this.hideSuccessTimer) clearTimeout(this.hideSuccessTimer);

    this.hideSuccessTimer = setTimeout(() => {
      this.fadingSuccess.set(true)
      setTimeout(() => {
        this.successMsg = null;
        this.sent = false;
        this.fadingSuccess.set(false);
      }, fadeMs);
    }, totalMs);
  }

  private scheduleErrorHide(totalMs = 3_000, fadeMs = 300) {
    this.fadingError.set(false);
    if (this.hideErrorTimer) clearTimeout(this.hideErrorTimer);

    this.hideErrorTimer = setTimeout(() => {
      this.fadingError.set(true);
      setTimeout(() => {
        this.errorMsg = null;
        this.fadingError.set(false);
      }, fadeMs);
    }, totalMs);
  }

  async onSubmit(form: NgForm) {
    if (!form.valid || this.sending) return;

    this.clearMessageTimers();
    this.fadingSuccess.set(false);
    this.fadingError.set(false);

    this.sending = true;
    this.sent = false;
    this.errorMsg = null;
    this.successMsg = null;

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
      this.successMsg = "Message sent. Thanks—I'll get back to you soon.";
      this.scheduleSuccessHide(3_000, 300);
      form.resetForm();
    } catch (e) {
      this.errorMsg = e instanceof Error ? e.message : 'Failed to send message';
      this.scheduleErrorHide(3_000, 300);
    } finally {
      this.sending = false;
    }
  }
}
