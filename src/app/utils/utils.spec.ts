import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import * as Utils from './utils';

const errorMessage = signal('');
const defaultMessage = 'Test default error message';

describe('App Utils', () => {
  describe(Utils.mergeTailwindCNs.name, () => {
    it('should not include a class from the 1st that exists in the 2nd', () => {
      const firstCN = 'foo bar tar-baz';
      const secondCN = 'wax-jar bar baz';
      const expectedCN = 'foo tar-baz wax-jar bar baz';
      expect(Utils.mergeTailwindCNs(firstCN, secondCN)).toBe(expectedCN);
      expect(Utils.mergeTailwindCNs(firstCN.split(' '), secondCN)).toBe(expectedCN);
      expect(Utils.mergeTailwindCNs(firstCN, secondCN.split(' '))).toBe(expectedCN);
      expect(Utils.mergeTailwindCNs(firstCN.split(' '), secondCN.split(' '))).toBe(expectedCN);
    });

    it('should not include a class from the 1st if one with same hyphen-prefix exists in the 2nd', () => {
      const firstCN = 'foo-bar baz-tar';
      const secondCN = 'wax bar-tar baz-tar';
      const expectedCN = 'foo-bar wax bar-tar baz-tar';
      expect(Utils.mergeTailwindCNs(firstCN, secondCN)).toBe(expectedCN);
      expect(Utils.mergeTailwindCNs(firstCN.split(' '), secondCN)).toBe(expectedCN);
      expect(Utils.mergeTailwindCNs(firstCN, secondCN.split(' '))).toBe(expectedCN);
      expect(Utils.mergeTailwindCNs(firstCN.split(' '), secondCN.split(' '))).toBe(expectedCN);
    });
  });

  describe(Utils.getResErrMsg.name, () => {
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

  describe(Utils.createResErrorHandler.name, () => {
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

  describe(Utils.sortByDate.name, () => {
    it('should sort items by their dates (in descending order)', () => {
      const first = { date: new Date(Date.now() - 1) };
      const second = { date: new Date(Date.now() - 2) };
      const third = { date: new Date(Date.now() - 3) };
      const items = [third, first, second];
      const expectedItems = [first, second, third];
      expect(Utils.sortByDate(items, (x) => x.date)).toStrictEqual(expectedItems);
    });

    it('should sort items by their dates (in ascending order)', () => {
      const first = { date: new Date(Date.now() - 1) };
      const second = { date: new Date(Date.now() - 2) };
      const third = { date: new Date(Date.now() - 3) };
      const items = [third, first, second];
      const expectedItems = [third, second, first];
      expect(Utils.sortByDate(items, (x) => x.date, 'asc')).toStrictEqual(expectedItems);
    });
  });
});
