import {Component, Input} from '@angular/core';
import { RouterOutlet } from '@angular/router';

// Adjust these imports to your actual header/footer component paths if different.
import { HeaderComponent } from '../../components/header/header.component';
import { FooterComponent } from '../../components/footer/footer.component';

@Component({
  selector: 'app-main-page',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent, FooterComponent],
  templateUrl: './main-page.component.html',
  styleUrl: './main-page.component.css',
})
export class MainPageComponent {
  @Input() title: string = 'Welcome to the Main Page';

}
