import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

// Firebase Auth (modular)
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  setPersistence,
  browserLocalPersistence,
  signInWithPopup,
  signInWithEmailAndPassword,
} from 'firebase/auth';

// Adjust this import path if your env lives elsewhere
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './login-page.component.html',
})
export class LoginPageComponent {
  email = '';
  password = '';
  errorMessage = '';

  private readonly app = initializeApp(environment.firebase);
  private readonly auth = getAuth(this.app);
  private readonly googleProvider = new GoogleAuthProvider();

  constructor(private readonly router: Router) {
    // Persist session across refreshes
    void setPersistence(this.auth, browserLocalPersistence);
  }

  async login() {
    // Email/password login
    this.errorMessage = '';
    try {
      await signInWithEmailAndPassword(this.auth, this.email, this.password);
      await this.router.navigate(['/admin']);
    } catch (e: any) {
      this.errorMessage = e?.message ?? 'Login failed';
    }
  }

  async loginWithGoogle() {
    this.errorMessage = '';
    try {
      await signInWithPopup(this.auth, this.googleProvider);
      await this.router.navigate(['/admin/dashboard']);
    } catch (e: any) {
      this.errorMessage = e?.message ?? 'Google sign-in failed';
    }
  }
}
