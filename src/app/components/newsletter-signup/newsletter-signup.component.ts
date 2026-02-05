import { Component, ChangeDetectionStrategy, Input, signal } from '@angular/core';

@Component({
  selector: 'app-newsletter-signup',
  standalone: true,
  templateUrl: './newsletter-signup.component.html',
  styleUrl: './newsletter-signup.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NewsletterSignupComponent {
  @Input() title = 'Get simple home tips in your inbox';
  @Input() subtitle = 'One email occasionally. No spam.';
  @Input() buttonLabel = 'Subscribe';

  protected readonly email = signal('');
  protected readonly status = signal<'idle' | 'success'>('idle');
  protected readonly error = signal<string | null>(null);

  protected onEmailInput(v: string) {
    this.email.set(v);
    this.error.set(null);
    this.status.set('idle');
  }

  protected submit() {
    const value = this.email().trim();

    if (!value) {
      this.error.set('Email is required.');
      return;
    }

    // Basic email check (no backend here)
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    if (!ok) {
      this.error.set('Please enter a valid email.');
      return;
    }

    // Placeholder "success" behavior
    this.status.set('success');
    this.error.set(null);
  }
}
