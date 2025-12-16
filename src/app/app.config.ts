import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { retryingInterceptor } from './retrying-interceptor';
import { authInterceptor } from './auth/auth-interceptor';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(withInterceptors([retryingInterceptor, authInterceptor])),
    provideRouter(routes, withComponentInputBinding()),
    provideBrowserGlobalErrorListeners(),
  ],
};
