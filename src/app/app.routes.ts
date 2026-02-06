import { Routes } from '@angular/router';
import { HomePageComponent } from './pages/home/home-page.component';
import { MainPageComponent } from './pages/main/main-page.component';

import { AdminLayoutComponent } from './pages/admin/admin-layout.component';
import { AdminPostsPageComponent } from './pages/admin/posts/admin-posts-page.component';

import { LoginPageComponent } from './pages/login/login-page.component';
import { AdminDashboardComponent } from './pages/admin/admin-dashboard/admin-dashboard.component';

import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { getAuth, onAuthStateChanged } from 'firebase/auth';

const adminAuthGuard: CanActivateFn = (_route, state) => {
  const router = inject(Router);

  return new Promise<boolean>((resolve) => {
    const auth = getAuth();
    const unsub = onAuthStateChanged(auth, (user) => {
      unsub();

      if (user) return resolve(true);

      void router.navigate(['/admin'], { queryParams: { returnUrl: state.url } });
      resolve(false);
    });
  });
};

const redirectAuthedFromAdminLoginGuard: CanActivateFn = (_route, _state) => {
  const router = inject(Router);

  return new Promise<boolean>((resolve) => {
    const auth = getAuth();
    const unsub = onAuthStateChanged(auth, (user) => {
      unsub();

      if (user) {
        void router.navigate(['/admin/dashboard']);
        return resolve(false);
      }

      resolve(true);
    });
  });
};

export const routes: Routes = [
  // Root shows login
  {
    path: '',
    pathMatch: 'full',
    component: MainPageComponent,
    children: [
      { path: '', component: HomePageComponent },
    ]
  },


  // Admin with sub routing
  {
    path: 'admin',
    component: AdminLayoutComponent,
    children: [
      { path: '', pathMatch: 'full', component: LoginPageComponent, canActivate: [redirectAuthedFromAdminLoginGuard] },
      { path: 'posts', canActivate: [adminAuthGuard], component: AdminPostsPageComponent },
      { path: 'dashboard', canActivate: [adminAuthGuard], component: AdminDashboardComponent }
    ],
  },

  { path: '**', redirectTo: '' },
];
