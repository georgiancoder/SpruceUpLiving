import {Component, OnDestroy, computed, signal, OnInit} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

// Firebase / Firestore (modular)
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  writeBatch,
  type Firestore,
  Unsubscribe, getDocs,
} from 'firebase/firestore';

// Adjust path if your environment lives elsewhere
import {environment} from '../../../../environments/environment';
import {HeaderNavLink, Subcategory} from '../../../components/header/header.component';

type MenuItem = {
  id: string;
  label: string;
  href: string;
  order: number;
  subcategories?: Subcategory[];
};

@Component({
  selector: 'app-admin-menu-page',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: 'admin-menu.component.html',
})
export class AdminMenuPageComponent implements OnDestroy, OnInit {
  readonly items = signal<MenuItem[]>([]);
  readonly loading = signal(true);
  readonly errorMessage = signal<string>('');

  private readonly app = initializeApp(environment.firebase);
  private readonly db: Firestore = getFirestore(this.app);
  private readonly colRef = collection(this.db, 'menu');

  newLabel = '';
  newUrl = '';


  constructor() {
    this.loadMenu();
  }


  private async loadMenu() {
    try {
      const db = getFirestore(); // expects firebase app to be initialized elsewhere
      const colRef = collection(db, 'menu'); // collection name: "menu"
      const snap = await getDocs(colRef);

      const items = await Promise.all(
        snap.docs.map(async (d) => {
          const data = d.data() as any;
          const id: string = d.id;
          const label: string = data?.label ?? 'Untitled';
          const href: string = data?.href ?? '#';
          const order: number = data?.order ?? 0;

          // read subcategories either from document field or subcollection
          let subs: Subcategory[] = [];
          if (Array.isArray(data?.subcategories)) {
            subs = data.subcategories.map((s: any) => ({
              id: s.id,
              label: s?.label ?? String(s ?? 'Untitled'),
              href: s?.href ?? '#',
              order: Number(data.order ?? 0),
            }));
          } else {
            try {
              const subCol = collection(db, 'menu', d.id, 'subcategories');
              const subSnap = await getDocs(subCol);
              subs = subSnap.docs.map((sd) => {
                const sdData = sd.data() as any;
                return {
                  id: sd.id,
                  label: sdData?.label ?? 'Untitled',
                  href: sdData?.href ?? '#',
                  order: Number(data.order ?? 0),
                } satisfies MenuItem;
              });
            } catch (e) {
              // ignore if subcollection doesn't exist or read fails
            }
          }

          const link: MenuItem = { id, label, href, order };
          if (subs.length) link.subcategories = subs;
          return link;
        })
      );
      console.log(items);
      this.items.set(items)
      this.loading.set(false)
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to load menu from Firestore', err);
    }
  }



  ngOnDestroy() {
  }

  ngOnInit() {

  }

  async add() {
    const label = this.newLabel.trim();
    const url = this.newUrl.trim();
    if (!label || !url) return;
    const maxOrder = this.items().reduce((m, it) => Math.max(m, it.order), -1);
    const order = maxOrder + 1;

    try {
      await addDoc(this.colRef, { label, href: url, order });
      this.newLabel = '';
      this.newUrl = '';
    } catch (e: any) {
      this.errorMessage.set(e?.message ?? 'Failed to add menu item');
    }
  }

  async remove(id: string) {
    try {
      await deleteDoc(doc(this.db, 'menu', id));
    } catch (e: any) {
      this.errorMessage.set(e?.message ?? 'Failed to delete menu item');
    }
  }

  async move(index: number, delta: -1 | 1) {
    const list = this.items();
    const nextIndex = index + delta;
    if (nextIndex < 0 || nextIndex >= list.length) return;

    // Swap in-memory order values and persist (batch)
    const a = list[index];
    const b = list[nextIndex];

    try {
      const batch = writeBatch(this.db);
      batch.update(doc(this.db, 'menuItems', a.id), { order: b.order });
      batch.update(doc(this.db, 'menuItems', b.id), { order: a.order });
      await batch.commit();
    } catch (e: any) {
      this.errorMessage.set(e?.message ?? 'Failed to reorder menu items');
    }
  }
}
