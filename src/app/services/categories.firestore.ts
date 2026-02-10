import { addDoc, collection, deleteDoc, doc, getDocs, orderBy, query, type Firestore, updateDoc } from 'firebase/firestore';
import {CategoryItem} from '../types/category.types';

export type Category = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  postCount?: number;
};

export type CategoryDoc = Omit<Category, 'id'>;

export async function fetchCategoriesOrderedByName(db: Firestore): Promise<CategoryItem[]> {
  const col = collection(db, 'categories');
  const q = query(col, orderBy('name', 'asc'));
  const snap = await getDocs(q);

  return snap.docs.map((d) => {
    const data = d.data() as Partial<CategoryDoc>;
    return {
      id: d.id,
      title: String(data.name ?? ''),
      href: '/' + String(data.slug ?? ''),
      slug: String(data.slug ?? ''),
      description: typeof data.description === 'string' ? data.description : undefined,
      postCount: typeof data.postCount === 'number' ? data.postCount : undefined,
    };
  });
}

// write helpers
export async function addCategory(db: Firestore, payload: CategoryDoc): Promise<string> {
  const ref = await addDoc(collection(db, 'categories'), payload);
  return ref.id;
}

export async function removeCategory(db: Firestore, id: string): Promise<void> {
  await deleteDoc(doc(db, 'categories', id));
}

export async function updateCategory(
  db: Firestore,
  id: string,
  patch: Pick<CategoryDoc, 'name' | 'slug' | 'description'>
): Promise<void> {
  await updateDoc(doc(db, 'categories', id), patch);
}
