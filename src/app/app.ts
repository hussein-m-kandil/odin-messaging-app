import {
  Router,
  RouterLink,
  RouterOutlet,
  NavigationEnd,
  NavigationError,
  RouterLinkActive,
} from '@angular/router';
import { inject, signal, OnInit, computed, Component, HostListener } from '@angular/core';
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
    RouterLinkActive,
    NgTemplateOutlet,
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

  protected readonly colorScheme = inject(ColorScheme);
  protected readonly auth = inject(Auth);

  protected readonly title = environment.title;
  protected readonly navItems = [
    { route: '/chats', label: 'Chats', icon: 'pi pi-comments' },
    { route: '/profiles', label: 'Profiles', icon: 'pi pi-users' },
  ] as const;

  protected readonly vpWidth = signal(0);
  protected readonly navErrMsg = signal('');
  protected readonly activeNavItemIndex = signal(0);
  protected readonly singularViewEnabled = signal(false);
  protected readonly navListRouteActivated = signal(this._isNavListUrl(this._router.url));

  protected readonly navigating = computed(() => !!this._router.currentNavigation());

  constructor() {
    this._router.events.pipe(takeUntilDestroyed()).subscribe((event) => {
      if (event instanceof NavigationError) {
        this._failedUrl = event.url;
        this.navErrMsg.set('Failed to load the requested page.');
      } else if (event instanceof NavigationEnd) {
        this.navListRouteActivated.set(this._isNavListUrl(event.urlAfterRedirects));
        this.activeNavItemIndex.set(
          this.navItems.findIndex(({ route }) => event.urlAfterRedirects.startsWith(route))
        );
      }
    });
  }

  private _isNavListUrl(url: string) {
    return this.navItems.some(({ route }) => url.endsWith(route));
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
