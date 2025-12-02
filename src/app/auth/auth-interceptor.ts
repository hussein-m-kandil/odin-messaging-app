import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Auth } from './auth';
import { tap } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(Auth);
  const token = auth.token();
  const authReq = token ? req.clone({ headers: req.headers.set('Authorization', token) }) : req;
  return next(authReq).pipe(
    tap({
      error: (error) => {
        if (error instanceof HttpErrorResponse && error.status === 401) {
          auth.signOut();
        }
      },
    })
  );
};
