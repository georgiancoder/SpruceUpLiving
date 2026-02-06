import { ChangeDetectionStrategy, Component, Input, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

export type HeaderNavLink = {
  label: string;
  href: string;
};

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderComponent implements OnInit {
  @Input() title: string = 'SpruceUp Living';
  // links are now loaded from Firestore
  readonly links = signal<HeaderNavLink[]>([]);

  ngOnInit(): void {
    this.loadMenu();
  }

  private async loadMenu() {
    try {
      const db = getFirestore(); // expects firebase app to be initialized elsewhere
      const colRef = collection(db, 'menu'); // collection name: "menu"
      const snap = await getDocs(colRef);
      const items = snap.docs.map((d) => {
        const data = d.data() as Partial<HeaderNavLink>;
        return {
          label: data.label ?? 'Untitled',
          href: data.href ?? '#'
        } as HeaderNavLink;
      });
      console.log(items);
      this.links.set(items);
    } catch (err) {
      // fail gracefully; keep links empty and log for debugging
      // eslint-disable-next-line no-console
      console.error('Failed to load menu from Firestore', err);
    }
  }
}
