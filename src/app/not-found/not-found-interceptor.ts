import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { Router } from '@angular/router';
import { inject } from '@angular/core';
import { tap } from 'rxjs';

export const notFoundInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  return next(req).pipe(
    tap({
      error: async (error) => {
        if (error instanceof HttpErrorResponse && error.status === 404) {
          await router.navigate(['/not-found'], { replaceUrl: true });
        }
      },
    })
  );
};
