export type CategoryItem = {
  id: string;
  title: string;
  href: string;
  description?: string;
  imageUrl?: string;
  slug?: string;
  postCount?: number;
  countLabel?: string; // e.g. "articles"
  views?: number;
};

export type CategoryDoc = {
  name?: string;
  slug?: string;
  description?: string;
  postCount?: number;
};

