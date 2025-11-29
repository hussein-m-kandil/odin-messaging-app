import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { NavigationError, Router, RouterOutlet } from '@angular/router';
import { Component, computed, inject, signal } from '@angular/core';
import { environment } from '../environments';
import { filter } from 'rxjs';
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
  protected readonly navErrMsg = signal('');

  protected readonly navigating = computed(() => !!this._router.currentNavigation());

  protected readonly title = environment.title;

  private _failedUrl = '';

  constructor() {
    this._router.events
      .pipe(
        takeUntilDestroyed(),
        filter((event) => event instanceof NavigationError)
      )
      .subscribe((event) => {
        this._failedUrl = event.url;
        this.navErrMsg.set('Failed to load the requested page.');
      });
  }

  protected retryNavigation() {
    const failedUrl = this._failedUrl;
    if (failedUrl) {
      this._failedUrl = '';
      this.navErrMsg.set('');
      this._router.navigateByUrl(failedUrl);
    }
  }

  protected signOut() {
    this._auth.signOut();
  }
}
