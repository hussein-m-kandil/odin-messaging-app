import { HttpErrorResponse } from '@angular/common/http';

const NETWORK_ERR_MSG = 'Failed! Check your internet connection.';

export function getResErrMsg(res: unknown, statusCodes = [400]): string | null {
  if (res instanceof HttpErrorResponse) {
    if (res.error instanceof ProgressEvent && res.status === 0) return NETWORK_ERR_MSG;
    else if (statusCodes.includes(res.status)) {
      const { error } = res;
      if (error.error) {
        if (typeof error.error === 'string') return error.error;
        else if (typeof error.error.message === 'string') return error.error.message;
      } else if (typeof error.message === 'string') return error.message;
      else if (typeof error === 'string') return error;
    }
  }
  return null;
}

export function createResErrorHandler(
  messageSignal: { set: (value: string) => void },
  defaultMessage: string,
) {
  return (res: unknown) => messageSignal.set(getResErrMsg(res) || defaultMessage);
}
