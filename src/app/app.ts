import { Router, RouterOutlet } from '@angular/router';
import { Component, computed, inject } from '@angular/core';
import { environment } from '../environments';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styles: ``,
})
export class App {
  private readonly _router = inject(Router);

  protected readonly navigating = computed(() => !!this._router.currentNavigation());

  protected readonly title = environment.title;
}
