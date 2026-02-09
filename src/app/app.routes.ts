import { Routes } from '@angular/router';
import { HomePageComponent } from './pages/home/home-page.component';
import { MainPageComponent } from './pages/main/main-page.component';

import { AdminLayoutComponent } from './pages/admin/admin-layout.component';
import { AdminPostsPageComponent } from './pages/admin/posts/admin-posts-page.component';

import { LoginPageComponent } from './pages/login/login-page.component';
import { AdminDashboardComponent } from './pages/admin/admin-dashboard/admin-dashboard.component';

import { adminAuthGuard } from './guards/admin-auth.guard';
import { redirectAuthedFromAdminLoginGuard } from './guards/redirect-authed-from-admin-login.guard';
import {AdminCategoriesPageComponent} from './pages/admin/categories/admin-categories-page.component';
import {AdminMenuPageComponent} from './pages/admin/menu/admin-menu-page.component';
import {AdminSliderPageComponent} from './pages/admin/slider/admin-slider.component';

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
      { path: 'dashboard', canActivate: [adminAuthGuard], component: AdminDashboardComponent },
      { path: 'categories', canActivate: [adminAuthGuard], component: AdminCategoriesPageComponent },
      { path: 'menu', canActivate: [adminAuthGuard], component: AdminMenuPageComponent },
      { path: "slider", canActivate: [adminAuthGuard], component: AdminSliderPageComponent },
    ],
  },

  { path: '**', redirectTo: '' },
];
