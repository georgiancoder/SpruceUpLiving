import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

export type FooterNavLink = {
  label: string;
  href: string;
};

@Component({
  selector: 'app-footer',
  standalone: true,
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FooterComponent {
  @Input() brand: string = 'SpruceUp Living';
  @Input() year: number = new Date().getFullYear();
  @Input() links: FooterNavLink[] = [];
}
