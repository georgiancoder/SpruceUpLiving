import { Component, OnDestroy, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

// Firebase Auth
import { getAuth, onAuthStateChanged, signOut, type User } from 'firebase/auth';

type DashboardUserVM = {
  displayName: string;
  email: string;
  photoURL: string | null;
};

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [RouterLink],
  templateUrl: 'admin-dashboard.component.html',
})
export class AdminDashboardComponent implements OnDestroy {
  readonly user = signal<DashboardUserVM | null>(null);

  private readonly auth = getAuth();
  private readonly unsubscribe = onAuthStateChanged(this.auth, (u: User | null) => {
    if (!u) {
      this.user.set(null);
      return;
    }

    this.user.set({
      displayName: u.displayName ?? '',
      email: u.email ?? '',
      photoURL: u.photoURL ?? null,
    });
  });

  constructor(private readonly router: Router) {}

  async logout() {
    await signOut(this.auth);
    await this.router.navigate(['/']);
  }

  ngOnDestroy() {
    this.unsubscribe();
  }
}
