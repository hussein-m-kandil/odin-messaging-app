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
import { environment } from '../environments';
import { Auth } from './auth';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NgTemplateOutlet],
  templateUrl: './app.html',
  styles: ``,
})
export class App implements OnInit {
  private _failedUrl = '';
  private readonly _router = inject(Router);

  protected readonly auth = inject(Auth);

  protected readonly title = environment.title;
  protected readonly navItems = ['Chats', 'Profiles'] as const;

  protected readonly vpWidth = signal(0);
  protected readonly navErrMsg = signal('');
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
      }
    });
  }

  private _isNavListUrl(url: string) {
    const urlPaths = url.split('/');
    const lastUrlPath = urlPaths[urlPaths.length - 1];
    return this.navItems.some((name) => lastUrlPath.startsWith(name.toLowerCase()));
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
