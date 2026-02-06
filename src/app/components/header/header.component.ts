import { ChangeDetectionStrategy, Component, Input, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

export type Subcategory = { label: string; href: string };
export type Category = { label: string; href?: string; subcategories: Subcategory[] };

// changed: include subcategories on nav link
export type HeaderNavLink = {
  label: string;
  href: string;
  subcategories?: Subcategory[];
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

  // new: categories signal
  readonly categories = signal<Category[]>([]);

  ngOnInit(): void {
    this.loadMenu();
  }

  // updated: load menu and their subcategories (array field or subcollection)
  private async loadMenu() {
    try {
      const db = getFirestore(); // expects firebase app to be initialized elsewhere
      const colRef = collection(db, 'menu'); // collection name: "menu"
      const snap = await getDocs(colRef);

      const items = await Promise.all(
        snap.docs.map(async (d) => {
          const data = d.data() as any;
          const label: string = data?.label ?? 'Untitled';
          const href: string = data?.href ?? '#';

          // read subcategories either from document field or subcollection
          let subs: Subcategory[] = [];
          if (Array.isArray(data?.subcategories)) {
            subs = data.subcategories.map((s: any) => ({
              label: s?.label ?? String(s ?? 'Untitled'),
              href: s?.href ?? '#'
            }));
          } else {
            try {
              const subCol = collection(db, 'menu', d.id, 'subcategories');
              const subSnap = await getDocs(subCol);
              subs = subSnap.docs.map((sd) => {
                const sdData = sd.data() as any;
                return {
                  label: sdData?.label ?? 'Untitled',
                  href: sdData?.href ?? '#'
                } as Subcategory;
              });
            } catch (e) {
              // ignore if subcollection doesn't exist or read fails
            }
          }

          const link: HeaderNavLink = { label, href };
          if (subs.length) link.subcategories = subs;
          return link;
        })
      );

      this.links.set(items);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to load menu from Firestore', err);
    }
  }

}
