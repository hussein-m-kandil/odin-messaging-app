import { Router, RouterLink, RouterOutlet, NavigationError } from '@angular/router';
import { inject, signal, computed, Component } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ButtonDirective } from 'primeng/button';
import { ErrorMessage } from './error-message';
import { environment } from '../environments';
import { MessageService } from 'primeng/api';
import { ColorScheme } from './color-scheme';
import { TabsModule } from 'primeng/tabs';
import { Ripple } from 'primeng/ripple';
import { Toast } from 'primeng/toast';
import { Spinner } from './spinner';
import { filter } from 'rxjs';
import { Auth } from './auth';

@Component({
  selector: 'app-root',
  imports: [
    ButtonDirective,
    RouterOutlet,
    ErrorMessage,
    RouterLink,
    TabsModule,
    Spinner,
    Ripple,
    Toast,
  ],
  templateUrl: './app.html',
  styles: ``,
  providers: [MessageService],
})
export class App {
  private _failedUrl = '';
  private readonly _router = inject(Router);
  private readonly _toast = inject(MessageService);

  protected readonly colorScheme = inject(ColorScheme);
  protected readonly auth = inject(Auth);

  protected readonly navErrMsg = signal('');

  protected readonly navigating = computed(() => !!this._router.currentNavigation());

  protected readonly title = environment.title;

  constructor() {
    this._router.events
      .pipe(
        takeUntilDestroyed(),
        filter((event): event is NavigationError => event instanceof NavigationError)
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
    this.auth.signOut();
    const user = this.auth.user();
    this._toast.add({
      severity: 'info',
      summary: `Bye${user ? ', ' + user.username : ''}`,
      detail: 'You have signed-out successfully.',
    });
  }
}
