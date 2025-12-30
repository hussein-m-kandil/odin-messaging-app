import { NavigationEnd, NavigationError, Router } from '@angular/router';
import { computed, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

const message = 'Failed to load the requested page.';

@Injectable({
  providedIn: 'root',
})
export class Navigation {
  private readonly _router = inject(Router);

  readonly error = signal<{ url: string; message: string } | null>(null);

  readonly current = computed(() => this._router.currentNavigation());

  readonly navigating = computed(() => !!this.current());

  readonly isInitial = signal(!this._router.navigated);

  constructor() {
    this._router.events.pipe(takeUntilDestroyed()).subscribe((event) => {
      if (event instanceof NavigationError) this.error.set({ url: event.url, message });
      else if (event instanceof NavigationEnd) this.isInitial.set(false);
    });
  }

  retry() {
    const error = this.error();
    if (error) {
      this.error.set(null);
      return this._router.navigateByUrl(error.url);
    }
    return Promise.resolve(false);
  }
}
