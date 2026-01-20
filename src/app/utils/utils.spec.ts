import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import * as Utils from './utils';

const errorMessage = signal('');
const defaultMessage = 'Test default error message';

describe('App Utils', () => {
  describe('getResErrMsg', () => {
    it('should return null', () => {
      const message = 7;
      const responses = [
        null,
        true,
        'foo',
        undefined,
        { foo: 'bar' },
        new HttpErrorResponse({ status: 500 }),
        new HttpErrorResponse({ status: 400, error: message }),
        new HttpErrorResponse({ status: 400, error: { message } }),
        new HttpErrorResponse({ status: 400, error: { error: message } }),
        new HttpErrorResponse({ status: 400, error: { error: { message } } }),
      ];
      for (const res of responses) expect(Utils.getResErrMsg(res)).toBeNull();
    });

    it('should return an error message', () => {
      const message = 'Test error!';
      const responses = [
        new HttpErrorResponse({ status: 400, error: message }),
        new HttpErrorResponse({ status: 400, error: { message } }),
        new HttpErrorResponse({ status: 400, error: { error: message } }),
        new HttpErrorResponse({ status: 400, error: { error: { message } } }),
      ];
      for (const res of responses) expect(Utils.getResErrMsg(res)).toBe(message);
    });
  });

  describe('createResErrorHandler', () => {
    it('should use the given error message on an arbitrary error', () => {
      const error = new Error('Test arbitrary error');
      Utils.createResErrorHandler(errorMessage, defaultMessage)(error);
      expect(errorMessage()).toBe(defaultMessage);
    });

    it('should use the given error message on a backend error', () => {
      const error = new HttpErrorResponse({ status: 500, statusText: 'Internal server error' });
      Utils.createResErrorHandler(errorMessage, defaultMessage)(error);
      expect(errorMessage()).toBe(defaultMessage);
    });

    it('should use the network error message on a network error', () => {
      const error = new HttpErrorResponse({
        error: new ProgressEvent('Network error'),
        statusText: 'Failed',
        status: 0,
      });
      Utils.createResErrorHandler(errorMessage, defaultMessage)(error);
      expect(errorMessage()).toMatch(/check .* (internet)? connection/i);
    });
  });
});
