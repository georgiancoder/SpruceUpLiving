import { Component, Input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';

export type PostGridItem = {
  id: string;
  title: string;
  description?: string;
  created_at?: string; // ISO string
  main_img?: string;
  category_ids?: string[];
  tags?: string[];
};

@Component({
  selector: 'app-posts-grid',
  standalone: true,
  imports: [RouterLink, DatePipe],
  templateUrl: './posts-grid.component.html',
})
export class PostsGridComponent {
  @Input({ required: true }) posts: PostGridItem[] = [];

  trackById = (_: number, p: PostGridItem) => p.id;

  asDate(value?: string): Date | null {
    if (!value) return null;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
}
