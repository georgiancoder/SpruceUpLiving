import { Routes } from '@angular/router';
import { HomePageComponent } from './pages/home/home-page.component';
import { MainPageComponent } from './pages/main/main-page.component';

import { AdminLayoutComponent } from './pages/admin/admin-layout.component';
import { AdminPostsPageComponent } from './pages/admin/posts/admin-posts-page.component';

import { LoginPageComponent } from './pages/login/login-page.component';
import { AdminDashboardComponent } from './pages/admin/admin-dashboard/admin-dashboard.component';

import { adminAuthGuard } from './guards/admin-auth.guard';
import { redirectAuthedFromAdminLoginGuard } from './guards/redirect-authed-from-admin-login.guard';
import { AdminCategoriesPageComponent } from './pages/admin/categories/admin-categories-page.component';
import { AdminMenuPageComponent } from './pages/admin/menu/admin-menu-page.component';
import { AdminSliderPageComponent } from './pages/admin/slider/admin-slider.component';
import { CategoriesPageComponent } from './pages/categories/categories-page.component';
import { PostPageComponent } from './pages/post/post-page.component';
import { NotFoundPageComponent } from './pages/not-found/not-found-page.component';
import { PrivacyPageComponent } from './pages/privacy/privacy-page.component';

export const routes: Routes = [
  // Root shows login
  {
    path: '',
    component: MainPageComponent,
    children: [
      { path: '', pathMatch: "full", component: HomePageComponent },
      { path: 'categories', component: CategoriesPageComponent },
      { path: 'categories/:categoryId', component: CategoriesPageComponent },
      { path: 'post/:postId', component: PostPageComponent },
      { path: 'privacy', component: PrivacyPageComponent, title: 'Privacy Policy' },
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

  // 404 (must be last)
  { path: '**', component: NotFoundPageComponent },
];
