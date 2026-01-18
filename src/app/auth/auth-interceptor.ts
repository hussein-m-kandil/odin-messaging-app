import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../environments';
import { inject } from '@angular/core';
import { Auth } from './auth';
import { tap } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(Auth);
  const token = auth.token();
  const withCredentials = req.url.startsWith(environment.apiUrl);
  const headers = token ? req.headers.set('Authorization', token) : req.headers;
  return next(req.clone({ headers, withCredentials })).pipe(
    tap({
      error: (error) => {
        if (error instanceof HttpErrorResponse && error.status === 401) {
          auth.signOut();
        }
      },
    }),
  );
};
