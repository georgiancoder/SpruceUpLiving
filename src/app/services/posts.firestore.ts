import { collection, getDocs, orderBy, query, type Firestore } from 'firebase/firestore';
import type { LatestPost } from '../components/latest-posts/latest-posts.component';

export type AdminPost = {
  id: string;
  title: string;
  description: string;
  content: string;
  created_at: string; // ISO string
  main_img: string;
  main_img_path?: string; // Firebase Storage path for deletion
  category_ids: string[];
  tags: string[]; // normalized to string[]
};

type PostDoc = {
  main_img?: unknown;
  title?: unknown;
  description?: unknown;
  created_at?: unknown;
  tags?: unknown;
  slug?: unknown;
  category_ids?: unknown;
};

export async function fetchPostsOrderedByCreatedAtDesc(db: Firestore): Promise<AdminPost[]> {
  const q = query(collection(db, 'posts'), orderBy('created_at', 'desc'));
  const snap = await getDocs(q);

  return snap.docs.map((d) => {
    const data: any = d.data();
    const rawTags = Array.isArray(data?.tags) ? data.tags : [];
    const tags = rawTags
      .map((t: any) => (typeof t === 'string' ? t : String(t?.title ?? '')))
      .filter(Boolean);

    return {
      id: d.id,
      title: String(data?.title ?? ''),
      description: String(data?.description ?? ''),
      content: String(data?.content ?? ''),
      created_at: String(data?.created_at ?? ''),
      main_img: String(data?.main_img ?? ''),
      main_img_path: data?.main_img_path ? String(data.main_img_path) : undefined,
      category_ids: Array.isArray(data?.category_ids) ? data.category_ids.map(String) : [],
      tags,
    };
  });
}

export async function fetchLatestPostsOrderedByCreatedAtDesc(
  db: Firestore,
  limitCount = 4
): Promise<LatestPost[]> {
  const q = query(collection(db, 'posts'), orderBy('created_at', 'desc'));
  const snap = await getDocs(q);

  const mapped = snap.docs
    .map((d) => {
      const data = d.data() as PostDoc;

      const title = String(data?.title ?? '').trim();
      if (!title) return null;

      const main_img = String(data?.main_img ?? '').trim();

      const slug = String(data?.slug ?? '').trim();
      const href = slug ? `/posts/${slug}` : `/posts/${d.id}`;

      const excerpt = typeof data?.description === 'string' ? data.description : undefined;
      const dateLabel = typeof data?.created_at === 'string' ? data.created_at : undefined;

      const rawTags = Array.isArray(data?.tags) ? (data.tags as unknown[]) : [];
      const tag = rawTags.length ? String(rawTags[0] ?? '').trim() : undefined;

      const categoryIds = Array.isArray(data?.category_ids) ? data.category_ids.map(String) : [];

      return { main_img, title, excerpt, href, dateLabel, tag, category_ids: categoryIds } as LatestPost;
    })
    .filter((x): x is LatestPost => !!x);

  return mapped.slice(0, Math.max(0, limitCount));
}
