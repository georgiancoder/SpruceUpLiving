import { Component, OnDestroy, signal } from '@angular/core';
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
  writeBatch,
  type Firestore,
  getDocs,
  query,
  orderBy,
  updateDoc,
} from 'firebase/firestore';

import { environment } from '../../../../environments/environment';
import { Subcategory } from '../../../components/header/header.component';

type MenuItem = {
  id: string;
  label: string;
  href: string;
  order: number;
  subcategories: Subcategory[]; // always defined for safe rendering
};

@Component({
  selector: 'app-admin-menu-page',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: 'admin-menu.component.html',
})
export class AdminMenuPageComponent implements OnDestroy {
  readonly items = signal<MenuItem[]>([]);
  readonly loading = signal(true);
  readonly errorMessage = signal<string>('');

  // edit state
  readonly editingId = signal<string | null>(null);
  editLabel = '';
  editUrl = '';

  // add-subcategory state
  readonly addingSubcategoryToId = signal<string | null>(null);
  subLabel = '';
  subUrl = '';

  // subcategory edit state
  readonly editingSubcategoryKey = signal<{ parentId: string; subId: string } | null>(null);
  subEditLabel = '';
  subEditUrl = '';

  private readonly app = initializeApp(environment.firebase);
  private readonly db: Firestore = getFirestore(this.app);
  private readonly colRef = collection(this.db, 'menu');

  newLabel = '';
  newUrl = '';

  constructor() {
    void this.loadMenu();
  }

  private async loadMenu() {
    this.loading.set(true);
    this.errorMessage.set('');

    try {
      const snap = await getDocs(query(this.colRef, orderBy('order', 'asc')));

      const items: MenuItem[] = await Promise.all(
        snap.docs.map(async (d) => {
          const data = d.data() as any;

          const id: string = d.id;
          const label: string = data?.label ?? 'Untitled';
          const href: string = data?.href ?? '#';
          const order: number = Number(data?.order ?? 0);

          let subs: Subcategory[] = [];

          if (Array.isArray(data?.subcategories)) {
            subs = data.subcategories
              .map((s: any) => ({
                id: String(s?.id ?? ''),
                label: s?.label ?? String(s ?? 'Untitled'),
                href: s?.href ?? '#',
                order: Number(s?.order ?? 0),
              }))
              .sort((a: any, b: any) => Number(a.order ?? 0) - Number(b.order ?? 0));
          } else {
            try {
              const subCol = collection(this.db, 'menu', d.id, 'subcategories');
              const subSnap = await getDocs(query(subCol, orderBy('order', 'asc')));

              subs = subSnap.docs
                .map((sd) => {
                  const sdData = sd.data() as any;
                  return {
                    id: sd.id,
                    label: sdData?.label ?? 'Untitled',
                    href: sdData?.href ?? '#',
                    order: Number(sdData?.order ?? 0),
                  } as Subcategory;
                })
                .sort((a: any, b: any) => Number(a.order ?? 0) - Number(b.order ?? 0));
            } catch {
              // ignore if subcollection doesn't exist or read fails
            }
          }

          return { id, label, href, order, subcategories: subs };
        }),
      );

      // Defensive sort (even though query orders by order)
      items.sort((a, b) => a.order - b.order);

      this.items.set(items);
      this.loading.set(false);
    } catch (err: any) {
      this.loading.set(false);
      this.errorMessage.set(err?.message ?? 'Failed to load menu from Firestore');
    }
  }

  ngOnDestroy() {
  }

  startEdit(item: MenuItem) {
    this.editingId.set(item.id);
    this.editLabel = item.label;
    this.editUrl = item.href;
  }

  cancelEdit() {
    this.editingId.set(null);
    this.editLabel = '';
    this.editUrl = '';
  }

  async saveEdit(item: MenuItem) {
    const label = this.editLabel.trim();
    const href = this.editUrl.trim();
    if (!label || !href) return;

    try {
      await updateDoc(doc(this.db, 'menu', item.id), { label, href });
      this.cancelEdit();
      this.loading.set(true);
      await this.loadMenu();
    } catch (e: any) {
      this.errorMessage.set(e?.message ?? 'Failed to update menu item');
    }
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
      this.loading.set(true);
      await this.loadMenu();
    } catch (e: any) {
      this.errorMessage.set(e?.message ?? 'Failed to add menu item');
    }
  }

  async remove(id: string) {
    try {
      await deleteDoc(doc(this.db, 'menu', id));
      this.loading.set(true);
      await this.loadMenu();
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
      batch.update(doc(this.db, 'menu', a.id), { order: b.order });
      batch.update(doc(this.db, 'menu', b.id), { order: a.order });
      await batch.commit();
      this.loading.set(true);
      await this.loadMenu();
    } catch (e: any) {
      this.errorMessage.set(e?.message ?? 'Failed to reorder menu items');
    }
  }

  startAddSubcategory(parent: MenuItem) {
    this.addingSubcategoryToId.set(parent.id);
    this.subLabel = '';
    this.subUrl = '';
  }

  cancelAddSubcategory() {
    this.addingSubcategoryToId.set(null);
    this.subLabel = '';
    this.subUrl = '';
  }

  toggleAddSubcategory(parent: MenuItem) {
    if (this.addingSubcategoryToId() === parent.id) {
      this.cancelAddSubcategory();
      return;
    }
    this.startAddSubcategory(parent);
  }

  async addSubcategory(parent: MenuItem) {
    const label = this.subLabel.trim();
    const href = this.subUrl.trim();
    if (!label || !href) return;

    try {
      const maxOrder = (parent.subcategories ?? []).reduce(
        (m, s: any) => Math.max(m, Number(s?.order ?? 0)),
        -1,
      );

      const subCol = collection(this.db, 'menu', parent.id, 'subcategories');
      await addDoc(subCol, { label, href, order: maxOrder + 1 });

      this.cancelAddSubcategory();
      this.loading.set(true);
      await this.loadMenu();
    } catch (e: any) {
      this.errorMessage.set(e?.message ?? 'Failed to add subcategory');
    }
  }

  async removeSubcategory(parent: MenuItem, subcategoryId: string) {
    try {
      await deleteDoc(doc(this.db, 'menu', parent.id, 'subcategories', subcategoryId));
      this.loading.set(true);
      await this.loadMenu();
    } catch (e: any) {
      this.errorMessage.set(e?.message ?? 'Failed to delete subcategory');
    }
  }

  startEditSubcategory(parent: MenuItem, sub: Subcategory) {
    this.editingSubcategoryKey.set({ parentId: parent.id, subId: sub.id });
    this.subEditLabel = sub.label ?? '';
    this.subEditUrl = sub.href ?? '';
  }

  cancelEditSubcategory() {
    this.editingSubcategoryKey.set(null);
    this.subEditLabel = '';
    this.subEditUrl = '';
  }

  async saveEditSubcategory(parent: MenuItem, sub: Subcategory) {
    const label = this.subEditLabel.trim();
    const href = this.subEditUrl.trim();
    if (!label || !href) return;

    try {
      await updateDoc(doc(this.db, 'menu', parent.id, 'subcategories', sub.id), { label, href });
      this.cancelEditSubcategory();
      this.loading.set(true);
      await this.loadMenu();
    } catch (e: any) {
      this.errorMessage.set(e?.message ?? 'Failed to update subcategory');
    }
  }
}
