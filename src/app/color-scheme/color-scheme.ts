import { inject, signal, effect, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { AppStorage } from '../app-storage';

export const STORAGE_KEY = 'scheme';
export const DARK_SCHEME_CN = 'app-dark';
export const SCHEMES = [
  { value: 'system', icon: 'pi pi-desktop' },
  { value: 'light', icon: 'pi pi-sun' },
  { value: 'dark', icon: 'pi pi-moon' },
] as const;

export const initColorScheme = () => {
  inject(ColorScheme).restore();
};

@Injectable({
  providedIn: 'root',
})
export class ColorScheme {
  private readonly _platformId = inject(PLATFORM_ID);
  private readonly _storage = inject(AppStorage);

  readonly scheme = signal<(typeof SCHEMES)[number]>(SCHEMES[0]);

  constructor() {
    effect((onCleanUp) => {
      const scheme = this.scheme();
      if (scheme.value === 'system') {
        if (isPlatformBrowser(this._platformId) && typeof window.matchMedia === 'function') {
          const darkSchemeMQ = window.matchMedia('(prefers-color-scheme: dark)');
          const handleSchemeMQChange = (event: MediaQueryListEvent) => this.apply(event.matches);
          onCleanUp(() => darkSchemeMQ.removeEventListener('change', handleSchemeMQChange));
          darkSchemeMQ.addEventListener('change', handleSchemeMQChange);
          this.apply(darkSchemeMQ.matches);
        }
      } else {
        this.apply(scheme.value === 'dark');
      }
    });
  }

  save() {
    this._storage.setItem(STORAGE_KEY, this.scheme().value);
  }

  restore() {
    if (isPlatformBrowser(this._platformId)) {
      const savedSchemeValue = this._storage.getItem(STORAGE_KEY);
      if (savedSchemeValue) {
        const scheme = SCHEMES.find((scheme) => scheme.value === savedSchemeValue);
        if (!scheme) this._storage.removeItem(STORAGE_KEY);
        else this.scheme.set(scheme);
      }
    }
  }

  apply(darkened: boolean) {
    if (isPlatformBrowser(this._platformId)) {
      if (darkened) document.documentElement.classList.add(DARK_SCHEME_CN);
      else document.documentElement.classList.remove(DARK_SCHEME_CN);
    }
  }

  switch() {
    this.scheme.update((colorScheme) => {
      const index = 1 + SCHEMES.findIndex(({ value }) => value === colorScheme.value);
      if (index < 0 || index >= SCHEMES.length) return SCHEMES[0];
      return SCHEMES[index];
    });
    this.save();
  }
}
