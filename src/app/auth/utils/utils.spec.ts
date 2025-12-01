import { UrlSegment } from '@angular/router';
import { isAuthUrl } from './utils';

describe('Auth utils', () => {
  describe('isAuthUrl', () => {
    it('should return `true`', () => {
      for (const suffix of ['in', 'up']) {
        [
          `/foo/sign${suffix}/?bar=tar&wzx=baz`,
          `/foo/sign${suffix}/?bar=tar`,
          `/foo/sign${suffix}?bar=tar`,
          `/foo/sign${suffix}/?`,
          `/foo/sign${suffix}?`,
          `/foo/sign${suffix}/`,
          `/sign${suffix}/`,
          `sign${suffix}/`,
          [{ path: `sign${suffix}` } as UrlSegment],
        ].forEach((url) => expect(isAuthUrl(url)).toBe(true));
      }
    });

    it('should return `false`', () => {
      for (const suffix of ['in', 'up']) {
        [
          `/foo/sign${suffix}/bar=tar&wzx=baz`,
          `/foo/sign${suffix}x`,
          `assign${suffix}`,
          `sign${suffix}s`,
          [{ path: `/sign${suffix}` } as UrlSegment],
          [{ path: `sign${suffix}/` } as UrlSegment],
        ].forEach((url) => expect(isAuthUrl(url)).toBe(false));
      }
    });
  });
});
