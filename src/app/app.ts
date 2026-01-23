import { Router, RouterLink, RouterOutlet, NavigationEnd, RouterLinkActive } from '@angular/router';
import { inject, signal, Component, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SingularView } from './mainbar/singular-view';
import { NgTemplateOutlet } from '@angular/common';
import { Navigator } from './navigation/navigator';
import { MessageService } from 'primeng/api';
import { Navigation } from './navigation';
import { TabsModule } from 'primeng/tabs';
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
    TabsModule,
    Navigator,
    Mainbar,
    Toast,
  ],
  templateUrl: './app.html',
  providers: [MessageService],
  host: {
    '(window:resize)': 'handleWindowResize()',
    '(window:focus)': 'chats.handleWindowFocus()',
  },
})
export class App implements OnInit {
  private readonly _router = inject(Router);

  protected readonly mainNavItems = [
    { route: '/chats', label: 'Chats', icon: 'pi pi-comments' },
    { route: '/profiles', label: 'Profiles', icon: 'pi pi-users' },
  ] as const;

  protected readonly singularView = inject(SingularView);
  protected readonly navigation = inject(Navigation);
  protected readonly chats = inject(Chats);
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
  }

  private _isMainMenuUrl(url: string) {
    return this.mainNavItems.some(({ route }) => new RegExp(`${route}/?$`).test(url));
  }

  protected handleWindowResize() {
    this.vpWidth.set(window.innerWidth);
  }

  ngOnInit() {
    this.handleWindowResize();
  }
}
