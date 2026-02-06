import { Routes } from '@angular/router';
import { HomePageComponent } from './pages/home/home-page.component';
import { MainPageComponent } from './pages/main/main-page.component';

import { AdminLayoutComponent } from './pages/admin/admin-layout.component';
import { AdminPostsPageComponent } from './pages/admin/posts/admin-posts-page.component';

import { LoginPageComponent } from './pages/login/login-page.component';

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
      { path: '', pathMatch: 'full', component: LoginPageComponent },
      { path: 'posts', component: AdminPostsPageComponent },
    ],
  },

  { path: '**', redirectTo: '' },
];
