import { Router, RouterLink, RouterOutlet, NavigationEnd, RouterLinkActive } from '@angular/router';
import { inject, signal, Component, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgTemplateOutlet } from '@angular/common';
import { Navigator } from './navigation/navigator';
import { ButtonDirective } from 'primeng/button';
import { environment } from '../environments';
import { MessageService } from 'primeng/api';
import { ColorScheme } from './color-scheme';
import { Navigation } from './navigation';
import { TabsModule } from 'primeng/tabs';
import { Ripple } from 'primeng/ripple';
import { Toast } from 'primeng/toast';
import { Auth } from './auth';
import { filter } from 'rxjs';

@Component({
  selector: 'app-root',
  imports: [
    NgTemplateOutlet,
    RouterLinkActive,
    ButtonDirective,
    RouterOutlet,
    RouterLink,
    TabsModule,
    Navigator,
    Ripple,
    Toast,
  ],
  templateUrl: './app.html',
  providers: [MessageService],
  host: { '(window:resize)': 'handleWindowResize()' },
})
export class App implements OnInit {
  private readonly _router = inject(Router);
  private readonly _toast = inject(MessageService);

  protected readonly title = environment.title;
  protected readonly mainNavItems = [
    { route: '/chats', label: 'Chats', icon: 'pi pi-comments' },
    { route: '/profiles', label: 'Profiles', icon: 'pi pi-users' },
  ] as const;

  protected readonly colorScheme = inject(ColorScheme);
  protected readonly navigation = inject(Navigation);
  protected readonly auth = inject(Auth);

  protected readonly vpWidth = signal(0);
  protected readonly activeMenuIndex = signal(0);
  protected readonly singularViewEnabled = signal(false);
  protected readonly mainMenuRouteActivated = signal(this._isMainMenuUrl(this._router.url));

  constructor() {
    this._router.events
      .pipe(
        takeUntilDestroyed(),
        filter((event): event is NavigationEnd => event instanceof NavigationEnd)
      )
      .subscribe((event) => {
        this.mainMenuRouteActivated.set(this._isMainMenuUrl(event.urlAfterRedirects));
        this.activeMenuIndex.set(
          this.mainNavItems.findIndex(({ route }) => event.urlAfterRedirects.startsWith(route))
        );
      });
  }

  private _isMainMenuUrl(url: string) {
    return this.mainNavItems.some(({ route }) => new RegExp(`${route}/?$`).test(url));
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

  protected handleWindowResize() {
    this.vpWidth.set(window.innerWidth);
  }

  ngOnInit() {
    this.handleWindowResize();
  }
}
