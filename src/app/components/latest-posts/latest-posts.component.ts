import { Component, ChangeDetectionStrategy, Input } from '@angular/core';
import {DatePipe} from '@angular/common';

export type LatestPost = {
  main_img: string;
  title: string;
  excerpt?: string;
  href: string;
  dateLabel?: string;
  tag?: string;
  categories?: string[];
};

@Component({
  selector: 'app-latest-posts',
  standalone: true,
  templateUrl: './latest-posts.component.html',
  styleUrl: './latest-posts.component.css',
  imports: [
    DatePipe
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LatestPostsComponent {
  @Input() title = 'Latest posts';
  @Input({ required: true }) posts: LatestPost[] = [];

  @Input() viewAllLabel?: string;
  @Input() viewAllHref?: string;

  @Input() maxItems = 4;


  get visiblePosts(): LatestPost[] {
    const n = Math.max(0, this.maxItems ?? 0);
    return (this.posts ?? []).slice(0, n);
  }
}
