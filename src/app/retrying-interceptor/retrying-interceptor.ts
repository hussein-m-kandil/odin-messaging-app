import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { retry, timer } from 'rxjs';

export const retryingInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    retry({
      count: 2,
      delay: (error) => {
        if (error instanceof HttpErrorResponse && error.status >= 400 && error.status < 500) {
          throw error;
        }
        return timer(0);
      },
    })
  );
};
