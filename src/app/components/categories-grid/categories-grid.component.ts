import { Component, ChangeDetectionStrategy, Input } from '@angular/core';

export type CategoryItem = {
  title: string;
  href: string;
  description?: string;
  imageUrl?: string;

  count?: number;
  countLabel?: string; // e.g. "articles"
};

@Component({
  selector: 'app-categories-grid',
  standalone: true,
  templateUrl: './categories-grid.component.html',
  styleUrl: './categories-grid.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CategoriesGridComponent {
  @Input() title = 'Categories';
  @Input() items: CategoryItem[] = [
    {
      title: 'Organization',
      description: 'Storage, routines, and declutter ideas.',
      href: '/categories/organization'
    },
    {
      title: 'Comfort',
      description: 'Cozy lighting, textures, and mood.',
      href: '/categories/comfort'
    },
    {
      title: 'Cleaning',
      description: 'Simple systems that keep things fresh.',
      href: '/categories/cleaning'
    },
    {
      title: 'Decor',
      description: 'Small upgrades with big impact.',
      href: '/categories/decor'
    }
  ];
}
