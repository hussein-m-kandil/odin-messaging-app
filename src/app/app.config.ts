import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { notFoundInterceptor } from './not-found/not-found-interceptor';
import { retryingInterceptor } from './retrying-interceptor';
import { authInterceptor } from './auth/auth-interceptor';
import { default as Aura } from '@primeuix/themes/aura';
import { providePrimeNG } from 'primeng/config';
import { routes } from './app.routes';

export const DARK_MODE_CN = 'app-dark';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(
      withInterceptors([retryingInterceptor, authInterceptor, notFoundInterceptor])
    ),
    provideRouter(routes, withComponentInputBinding()),
    provideBrowserGlobalErrorListeners(),
    providePrimeNG({
      inputVariant: 'filled',
      ripple: true,
      theme: {
        preset: Aura,
        options: {
          darkModeSelector: `.${DARK_MODE_CN}`,
          cssLayer: {
            name: 'primeng',
            order: 'theme, base, primeng',
          },
        },
      },
    }),
  ],
};
