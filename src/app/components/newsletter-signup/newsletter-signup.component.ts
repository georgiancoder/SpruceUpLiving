import { Component, ChangeDetectionStrategy, Input, signal } from '@angular/core';
import { addDoc, collection, getDocs, getFirestore, serverTimestamp } from 'firebase/firestore';

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

  protected readonly existingEmails = signal<Set<string>>(new Set());
  protected readonly loadingExisting = signal(false);
  protected readonly fetchError = signal<string | null>(null);

  constructor() {
    void this.fetchExistingEmails();
  }

  private async fetchExistingEmails() {
    this.loadingExisting.set(true);
    this.fetchError.set(null);

    try {
      const db = getFirestore();
      const colRef = collection(db, 'newsletterSubscribers');
      const snap = await getDocs(colRef);

      const set = new Set<string>();
      snap.forEach(d => {
        const e = (d.data() as any)?.email;
        if (typeof e === 'string' && e.trim()) set.add(e.trim().toLowerCase());
      });

      this.existingEmails.set(set);
    } catch (e: any) {
      this.fetchError.set(e?.message ?? 'Failed to load subscribers.');
      this.existingEmails.set(new Set());
    } finally {
      this.loadingExisting.set(false);
    }
  }

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

    const normalized = value.toLowerCase();

    if (this.existingEmails().has(normalized)) {
      this.status.set('idle');
      this.error.set('This email is already subscribed.');
      return;
    }

    this.sending.set(true);
    this.error.set(null);

    try {
      const db = getFirestore();
      const colRef = collection(db, 'newsletterSubscribers');

      await addDoc(colRef, {
        email: normalized,
        createdAt: serverTimestamp(),
        source: 'newsletter-signup',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
        pageUrl: typeof location !== 'undefined' ? location.href : null,
      });

      // keep local cache in sync without refetch
      this.existingEmails.update(prev => {
        const next = new Set(prev);
        next.add(normalized);
        return next;
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
