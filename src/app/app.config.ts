import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { notFoundInterceptor } from './not-found/not-found-interceptor';
import { retryingInterceptor } from './retrying-interceptor';
import { authInterceptor } from './auth/auth-interceptor';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(
      withInterceptors([retryingInterceptor, authInterceptor, notFoundInterceptor])
    ),
    provideRouter(routes, withComponentInputBinding()),
    provideBrowserGlobalErrorListeners(),
  ],
};
