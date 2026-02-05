import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

export type HeaderNavLink = {
  label: string;
  href: string;
};

@Component({
  selector: 'app-header',
  standalone: true,
  templateUrl: './header.component.html',
  styleUrl: './header.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderComponent {
  @Input() title: string = 'SpruceUp Living';
  @Input() links: HeaderNavLink[] = [];
}
