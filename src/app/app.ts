import {
  Router,
  RouterLink,
  RouterOutlet,
  NavigationEnd,
  NavigationError,
  RouterLinkActive,
} from '@angular/router';
import { inject, signal, computed, Component, OnInit, HostListener } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgTemplateOutlet } from '@angular/common';
import { ButtonDirective } from 'primeng/button';
import { ErrorMessage } from './error-message';
import { environment } from '../environments';
import { MessageService } from 'primeng/api';
import { ColorScheme } from './color-scheme';
import { TabsModule } from 'primeng/tabs';
import { Ripple } from 'primeng/ripple';
import { Toast } from 'primeng/toast';
import { Spinner } from './spinner';
import { Auth } from './auth';

@Component({
  selector: 'app-root',
  imports: [
    NgTemplateOutlet,
    RouterLinkActive,
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
export class App implements OnInit {
  private _failedUrl = '';
  private readonly _router = inject(Router);
  private readonly _toast = inject(MessageService);

  protected readonly title = environment.title;
  protected readonly mainNavItems = [
    { route: '/chats', label: 'Chats', icon: 'pi pi-comments' },
    { route: '/profiles', label: 'Profiles', icon: 'pi pi-users' },
  ] as const;

  protected readonly colorScheme = inject(ColorScheme);
  protected readonly auth = inject(Auth);

  protected readonly navigating = computed(() => !!this._router.currentNavigation());

  protected readonly vpWidth = signal(0);
  protected readonly navErrMsg = signal('');
  protected readonly activeMenuIndex = signal(0);
  protected readonly singularViewEnabled = signal(false);
  protected readonly mainMenuRouteActivated = signal(this._isMainMenuUrl(this._router.url));

  constructor() {
    this._router.events.pipe(takeUntilDestroyed()).subscribe((event) => {
      if (event instanceof NavigationError) {
        this._failedUrl = event.url;
        this.navErrMsg.set('Failed to load the requested page.');
      } else if (event instanceof NavigationEnd) {
        this.mainMenuRouteActivated.set(this._isMainMenuUrl(event.urlAfterRedirects));
        this.activeMenuIndex.set(
          this.mainNavItems.findIndex(({ route }) => event.urlAfterRedirects.startsWith(route))
        );
      }
    });
  }

  private _isMainMenuUrl(url: string) {
    return this.mainNavItems.some(({ route }) => new RegExp(`${route}/?$`).test(url));
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

  protected toggleSingularView() {
    this.singularViewEnabled.update((enabled) => !enabled);
  }

  @HostListener('window:resize')
  protected handleWindowResize() {
    this.vpWidth.set(window.innerWidth);
  }

  ngOnInit() {
    this.handleWindowResize();
  }
}
