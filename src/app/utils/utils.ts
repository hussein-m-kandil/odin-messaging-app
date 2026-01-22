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

export function mergeTailwindCNs(aCN: string | string[], bCN: string | string[]) {
  const aCNs = typeof aCN === 'string' ? aCN.split(' ') : aCN;
  const bCNs = typeof bCN === 'string' ? bCN.split(' ') : bCN;
  return aCNs
    .filter((a) => !bCNs.some((b) => a.split('-')[0] === b.split('-')[0]))
    .concat(bCNs)
    .join(' ');
}

export function sortByDate<T>(
  items: readonly T[],
  dateSelector: (item: T) => Date | string,
  order: 'asc' | 'desc' = 'desc',
): T[] {
  return [...items].sort(
    (a, b) =>
      (new Date(dateSelector(a)).getTime() - new Date(dateSelector(b)).getTime()) *
      (order === 'desc' ? -1 : 1),
  );
}
