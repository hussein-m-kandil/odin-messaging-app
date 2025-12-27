import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Component, HostListener, inject, signal, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgTemplateOutlet } from '@angular/common';
import { ButtonDirective } from 'primeng/button';
import { TabsModule } from 'primeng/tabs';
import { Ripple } from 'primeng/ripple';
import { filter } from 'rxjs';

@Component({
  selector: 'app-home',
  imports: [
    RouterLinkActive,
    NgTemplateOutlet,
    ButtonDirective,
    RouterOutlet,
    RouterLink,
    TabsModule,
    Ripple,
  ],
  templateUrl: './home.html',
  styles: ``,
})
export class Home implements OnInit {
  private readonly _router = inject(Router);

  protected readonly navItems = [
    { route: '/chats', label: 'Chats', icon: 'pi pi-comments' },
    { route: '/profiles', label: 'Profiles', icon: 'pi pi-users' },
  ] as const;

  protected readonly vpWidth = signal(0);
  protected readonly activeNavItemIndex = signal(0);
  protected readonly singularViewEnabled = signal(false);
  protected readonly navListRouteActivated = signal(this._isNavListUrl(this._router.url));

  constructor() {
    this._router.events
      .pipe(
        takeUntilDestroyed(),
        filter((event): event is NavigationEnd => event instanceof NavigationEnd)
      )
      .subscribe((event) => {
        this.navListRouteActivated.set(this._isNavListUrl(event.urlAfterRedirects));
        this.activeNavItemIndex.set(
          this.navItems.findIndex(({ route }) => event.urlAfterRedirects.startsWith(route))
        );
      });
  }

  private _isNavListUrl(url: string) {
    return this.navItems.some(({ route }) => url.endsWith(route));
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
