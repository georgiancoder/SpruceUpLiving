import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-categories-header',
  standalone: true,
  imports: [],
  templateUrl: './categories-header.component.html',
})
export class CategoriesHeaderComponent {
  @Input() title = 'Categories';
  @Input() subtitle = 'Browse all categories.';

  @Input() actionText: string | null = 'Back home';
  @Input() actionLink: string | null = '/';

  @Input() query = '';
  @Output() queryChange = new EventEmitter<string>();
}
