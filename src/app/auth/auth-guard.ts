import { CanActivateFn, RedirectCommand, Router } from '@angular/router';
import { authNavOpts, isAuthUrl } from './utils';
import { inject } from '@angular/core';
import { Auth } from './auth';
import { map } from 'rxjs';

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const auth = inject(Auth);
  return auth.authenticated$.pipe(
    map((authenticated) => {
      const authenticating = isAuthUrl(route.url);
      let redirectCommand: RedirectCommand | undefined;
      if (authenticating && authenticated) {
        redirectCommand = new RedirectCommand(router.createUrlTree(['/']), authNavOpts);
      } else if (!authenticating && !authenticated) {
        redirectCommand = new RedirectCommand(
          router.createUrlTree(['/signin'], { queryParams: { url: state.url } }),
          authNavOpts,
        );
      }
      return redirectCommand || true;
    }),
  );
};
