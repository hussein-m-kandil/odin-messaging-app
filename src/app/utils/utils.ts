import { HttpErrorResponse } from '@angular/common/http';
import { WritableSignal } from '@angular/core';

export function createResErrorHandler(
  messageSignal: WritableSignal<string>,
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
