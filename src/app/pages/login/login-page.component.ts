import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './login-page.component.html',
})
export class LoginPageComponent {
  email = '';
  password = '';

  constructor(private readonly router: Router) {}

  login() {
    // TODO: replace with real auth; for now route to admin
    void this.router.navigate(['/admin']);
  }
}

