import { Component, ChangeDetectionStrategy, Input, signal } from '@angular/core';
import { addDoc, collection, getFirestore, serverTimestamp } from 'firebase/firestore';

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
  protected readonly sending = signal(false);

  protected onEmailInput(v: string) {
    this.email.set(v);
    this.error.set(null);
    this.status.set('idle');
  }

  protected async submit() {
    if (this.sending()) return;

    const value = this.email().trim();

    if (!value) {
      this.error.set('Email is required.');
      return;
    }

    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    if (!ok) {
      this.error.set('Please enter a valid email.');
      return;
    }

    this.sending.set(true);
    this.error.set(null);

    try {
      const db = getFirestore();
      const colRef = collection(db, 'newsletterSubscribers');

      await addDoc(colRef, {
        email: value.toLowerCase(),
        createdAt: serverTimestamp(),
        source: 'newsletter-signup',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
        pageUrl: typeof location !== 'undefined' ? location.href : null,
      });

      this.status.set('success');
      this.email.set('');
    } catch (e: any) {
      this.status.set('idle');
      this.error.set(e?.message ?? 'Failed to subscribe. Please try again.');
    } finally {
      this.sending.set(false);
    }
  }
}
