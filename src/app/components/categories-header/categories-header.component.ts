import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-categories-header',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './categories-header.component.html',
})
export class CategoriesHeaderComponent {
  @Input() title = 'Categories';
  @Input() subtitle = 'Browse all categories.';

  // Optional action (e.g. "Back home")
  @Input() actionText: string | null = 'Back home';
  @Input() actionLink: string | null = '/';
}

