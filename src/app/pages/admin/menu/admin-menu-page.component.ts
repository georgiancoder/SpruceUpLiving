import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

type MenuItem = {
  id: string;
  label: string;
  url: string;
};

function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

@Component({
  selector: 'app-admin-menu-page',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: 'admin-menu.component.html'
})
export class AdminMenuPageComponent {
  readonly items = signal<MenuItem[]>([
    { id: uid(), label: 'Home', url: '/main' },
    { id: uid(), label: 'Dashboard', url: '/admin/dashboard' },
  ]);

  newLabel = '';
  newUrl = '';

  readonly canAdd = computed(() => this.newLabel.trim().length > 0 && this.newUrl.trim().length > 0);

  add() {
    const label = this.newLabel.trim();
    const url = this.newUrl.trim();
    if (!label || !url) return;

    this.items.update((list) => [{ id: uid(), label, url }, ...list]);
    this.newLabel = '';
    this.newUrl = '';
  }

  remove(id: string) {
    this.items.update((list) => list.filter((x) => x.id !== id));
  }

  move(index: number, delta: -1 | 1) {
    const list = [...this.items()];
    const nextIndex = index + delta;
    if (nextIndex < 0 || nextIndex >= list.length) return;

    const tmp = list[index];
    list[index] = list[nextIndex];
    list[nextIndex] = tmp;

    this.items.set(list);
  }
}

