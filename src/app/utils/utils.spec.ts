import { HttpErrorResponse } from '@angular/common/http';
import { createResErrorHandler } from './utils';
import { signal } from '@angular/core';

const errorMessage = signal('');
const defaultMessage = 'Test default error message';

describe('App Utils', () => {
  describe('createResErrorHandler', () => {
    it('should return a function', () => {
      expect(createResErrorHandler(errorMessage, defaultMessage)).toBeTypeOf('function');
      expect(errorMessage()).toBe('');
    });

    it('should use the given error message on an arbitrary error', () => {
      const error = new Error('Test arbitrary error');
      createResErrorHandler(errorMessage, defaultMessage)(error);
      expect(errorMessage()).toBe(defaultMessage);
    });

    it('should use the given error message on a backend error', () => {
      const error = new HttpErrorResponse({ status: 500, statusText: 'Internal server error' });
      createResErrorHandler(errorMessage, defaultMessage)(error);
      expect(errorMessage()).toBe(defaultMessage);
    });

    it('should use the network error message on a network error', () => {
      const error = new HttpErrorResponse({
        error: new ProgressEvent('Network error'),
        statusText: 'Failed',
        status: 0,
      });
      createResErrorHandler(errorMessage, defaultMessage)(error);
      expect(errorMessage()).toMatch(/check .* (internet)? connection/i);
    });
  });
});
