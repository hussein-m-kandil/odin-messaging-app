import {
  ApplicationConfig,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter, TitleStrategy, withComponentInputBinding } from '@angular/router';
import { notFoundInterceptor } from './not-found/not-found-interceptor';
import { initColorScheme, DARK_SCHEME_CN } from './color-scheme';
import { retryingInterceptor } from './retrying-interceptor';
import { RouteTitleStrategy, routes } from './app.routes';
import { authInterceptor } from './auth/auth-interceptor';
import { default as Aura } from '@primeuix/themes/aura';
import { providePrimeNG } from 'primeng/config';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(
      withInterceptors([retryingInterceptor, authInterceptor, notFoundInterceptor])
    ),
    provideRouter(routes, withComponentInputBinding()),
    provideAppInitializer(initColorScheme),
    provideBrowserGlobalErrorListeners(),
    providePrimeNG({
      inputVariant: 'filled',
      ripple: true,
      theme: {
        preset: Aura,
        options: {
          darkModeSelector: `.${DARK_SCHEME_CN}`,
          cssLayer: {
            name: 'primeng',
            order: 'theme, base, primeng',
          },
        },
      },
    }),
    { provide: TitleStrategy, useClass: RouteTitleStrategy },
  ],
};
