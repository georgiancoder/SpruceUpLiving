import { Component, ChangeDetectionStrategy, Input } from '@angular/core';

export type LatestPost = {
  title: string;
  excerpt?: string;
  href: string;
  dateLabel?: string;
  tag?: string;
};

@Component({
  selector: 'app-latest-posts',
  standalone: true,
  templateUrl: './latest-posts.component.html',
  styleUrl: './latest-posts.component.css',
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
