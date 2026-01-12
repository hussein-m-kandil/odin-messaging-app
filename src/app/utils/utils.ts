import { HttpErrorResponse } from '@angular/common/http';

export function createResErrorHandler(
  messageSignal: { set: (value: string) => void },
  defaultMessage: string
) {
  return (res: unknown) => {
    if (res instanceof HttpErrorResponse && res.error instanceof ProgressEvent && !res.status) {
      messageSignal.set('Failed! Check your internet connection.');
    } else {
      messageSignal.set(defaultMessage);
    }
  };
}
