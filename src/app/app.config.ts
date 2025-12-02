import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { retryingInterceptor } from './retrying-interceptor';
import { authInterceptor } from './auth/auth-interceptor';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(withInterceptors([retryingInterceptor, authInterceptor])),
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
  ],
};
