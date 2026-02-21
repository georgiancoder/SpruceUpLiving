import { addDoc, collection, getDocs, getFirestore, serverTimestamp } from 'firebase/firestore';

export async function fetchExistingEmails(): Promise<Set<string>> {
  const db = getFirestore();
  const colRef = collection(db, 'newsletterSubscribers');
  const snap = await getDocs(colRef);

  const set = new Set<string>();
  snap.forEach(d => {
    const e = (d.data() as any)?.email;
    if (typeof e === 'string' && e.trim()) set.add(e.trim().toLowerCase());
  });

  return set;
}

export type AddNewsletterSubscriberInput = {
  email: string;
  source?: string;
  userAgent?: string | null;
  pageUrl?: string | null;
};

export async function addNewsletterSubscriberEmail(input: AddNewsletterSubscriberInput) {
  const normalized = input.email.trim().toLowerCase();
  if (!normalized) throw new Error('Email is required.');

  const db = getFirestore();
  const colRef = collection(db, 'newsletterSubscribers');

  return addDoc(colRef, {
    email: normalized,
    createdAt: serverTimestamp(),
    source: input.source ?? 'newsletter-signup',
    userAgent: input.userAgent ?? null,
    pageUrl: input.pageUrl ?? null,
  });
}
