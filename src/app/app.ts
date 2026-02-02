import { Router, RouterLink, RouterOutlet, NavigationEnd, RouterLinkActive } from '@angular/router';
import { inject, signal, OnInit, Component, afterNextRender, OnDestroy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SingularView } from './mainbar/singular-view';
import { NgTemplateOutlet } from '@angular/common';
import { Navigator } from './navigation/navigator';
import { Tab, Tabs, TabList } from 'primeng/tabs';
import { MessageService } from 'primeng/api';
import { Splitter } from 'primeng/splitter';
import { Navigation } from './navigation';
import { Profiles } from './profiles';
import { Toast } from 'primeng/toast';
import { Mainbar } from './mainbar';
import { Chats } from './chats';
import { Auth } from './auth';
import { filter } from 'rxjs';

@Component({
  selector: 'app-root',
  imports: [
    NgTemplateOutlet,
    RouterLinkActive,
    RouterOutlet,
    RouterLink,
    Navigator,
    Splitter,
    Mainbar,
    Toast,
    Tab,
    Tabs,
    TabList,
  ],
  templateUrl: './app.html',
  providers: [MessageService],
  host: {
    '(window:resize)': 'handleWindowResize()',
    '(window:focus)': 'handleWindowFocus()',
  },
})
export class App implements OnInit, OnDestroy {
  protected readonly _profiles = inject(Profiles);
  private readonly _router = inject(Router);
  private readonly _chats = inject(Chats);

  private _httpPollingIntervalId = 0;

  protected readonly mainNavItems = [
    { route: '/chats', label: 'Chats', icon: 'pi pi-comments' },
    { route: '/profiles', label: 'Profiles', icon: 'pi pi-users' },
    { route: '/followers', label: 'Followers', icon: 'pi pi-users' },
    { route: '/following', label: 'Following', icon: 'pi pi-users' },
  ] as const;

  protected readonly singularView = inject(SingularView);
  protected readonly navigation = inject(Navigation);
  protected readonly auth = inject(Auth);

  protected readonly vpWidth = signal(0);
  protected readonly activeMenuIndex = signal(0);
  protected readonly notFoundRouteActivated = signal(this._router.url === '/not-found');
  protected readonly mainMenuRouteActivated = signal(this._isMainMenuUrl(this._router.url));

  constructor() {
    this._router.events
      .pipe(
        takeUntilDestroyed(),
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      )
      .subscribe((event) => {
        this.notFoundRouteActivated.set(event.urlAfterRedirects === '/not-found');
        this.mainMenuRouteActivated.set(this._isMainMenuUrl(event.urlAfterRedirects));
        this.activeMenuIndex.set(
          this.mainNavItems.findIndex(({ route }) => event.urlAfterRedirects.startsWith(route)),
        );
      });

    afterNextRender(() => {
      import('@emoji-mart/data').catch();
      this._httpPollingIntervalId = setInterval(() => this._chats.refresh(), 5000);
    });

    this.auth.userSignedOut.subscribe(() => this._reset());
  }

  private _isMainMenuUrl(url: string) {
    return this.mainNavItems.some(({ route }) => new RegExp(`${route}/?$`).test(url));
  }

  private _reset() {
    this._profiles.reset();
    this._chats.reset();
  }

  protected handleWindowResize() {
    this.vpWidth.set(window.innerWidth);
  }

  protected handleWindowFocus() {
    if (this.auth.user()) this._chats.refresh();
  }

  ngOnInit() {
    this.handleWindowResize();
  }

  ngOnDestroy() {
    clearInterval(this._httpPollingIntervalId);
  }
}
