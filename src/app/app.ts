import { Component, computed, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { environment } from '../environments';
import { Auth } from './auth';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styles: ``,
})
export class App {
  private readonly _router = inject(Router);
  private readonly _auth = inject(Auth);

  protected readonly authenticated = toSignal(this._auth.authenticated$, { initialValue: false });

  protected readonly navigating = computed(() => !!this._router.currentNavigation());

  protected readonly title = environment.title;

  protected signOut() {
    this._auth.signOut();
  }
}
