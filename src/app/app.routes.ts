import { Routes } from '@angular/router';
import { HomePageComponent } from './pages/home/home-page.component';
import { MainPageComponent } from './pages/main/main-page.component';

import { AdminLayoutComponent } from './pages/admin/admin-layout.component';
import { AdminPostsPageComponent } from './pages/admin/posts/admin-posts-page.component';

import { LoginPageComponent } from './pages/login/login-page.component';
import { AdminDashboardComponent } from './pages/admin/admin-dashboard/admin-dashboard.component';

import { adminAuthGuard } from './guards/admin-auth.guard';
import { redirectAuthedFromAdminLoginGuard } from './guards/redirect-authed-from-admin-login.guard';

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
