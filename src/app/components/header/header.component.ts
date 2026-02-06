import { ChangeDetectionStrategy, Component, Input, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { getFirestore, collection, getDocs, query, orderBy } from 'firebase/firestore';

export type Subcategory = { id: string; label: string; href: string; order: number };
export type Category = { label: string; href?: string; subcategories: Subcategory[] };

// changed: include subcategories on nav link
export type HeaderNavLink = {
  label: string;
  href: string;
  order?: number; // new: ordering for top-level links
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
      const snap = await getDocs(query(colRef, orderBy('order', 'asc')));

      const items = await Promise.all(
        snap.docs.map(async (d) => {
          const data = d.data() as any;
          const label: string = data?.label ?? 'Untitled';
          const href: string = data?.href ?? '#';
          const order: number = Number(data?.order ?? 0);

          // read subcategories either from document field or subcollection
          let subs: Subcategory[] = [];
          if (Array.isArray(data?.subcategories)) {
            subs = data.subcategories
              .map((s: any, idx: number) => ({
                id: String(s?.id ?? `${d.id}-${idx}`),
                label: String(s?.label ?? s ?? 'Untitled'),
                href: String(s?.href ?? '#'),
                order: Number(s?.order ?? idx),
              }))
              .sort((a: Subcategory, b: Subcategory) => a.order - b.order);
          } else {
            try {
              const subCol = collection(db, 'menu', d.id, 'subcategories');
              const subSnap = await getDocs(query(subCol, orderBy('order', 'asc')));
              subs = subSnap.docs
                .map((sd) => {
                  const sdData = sd.data() as any;
                  return {
                    id: sd.id,
                    label: String(sdData?.label ?? 'Untitled'),
                    href: String(sdData?.href ?? '#'),
                    order: Number(sdData?.order ?? 0),
                  } as Subcategory;
                })
                .sort((a: Subcategory, b: Subcategory) => a.order - b.order);
            } catch (e) {
              // ignore if subcollection doesn't exist or read fails
            }
          }

          const link: HeaderNavLink = { label, href, order };
          if (subs.length) link.subcategories = subs;
          return link;
        }),
      );

      // Defensive sort (query already orders, but keep stable)
      items.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      this.links.set(items);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to load menu from Firestore', err);
    }
  }
}
