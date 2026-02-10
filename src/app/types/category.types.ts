export type CategoryItem = {
  id: string;
  title: string;
  href: string;
  description?: string;
  imageUrl?: string;

  count?: number;
  countLabel?: string; // e.g. "articles"
};

export type CategoryDoc = {
  name?: string;
  slug?: string;
  description?: string;
  postCount?: number;
};

