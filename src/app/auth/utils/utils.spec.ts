import { UrlSegment } from '@angular/router';
import { getValidAuthDataOrThrowServerError, isAuthData, isAuthUrl } from './utils';

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

  describe('Auth data validity', () => {
    it('should be valid', () => {
      const randId = crypto.randomUUID();
      const authData = [
        {
          user: { id: randId, username: 'foo', fullname: 'Foo Bar', profile: { id: randId } },
          token: 'test_token',
        },
      ];
      for (const data of authData) {
        expect(isAuthData(data)).toBe(true);
        expect(() => getValidAuthDataOrThrowServerError(data)).not.toThrow();
      }
    });

    it('should be invalid', () => {
      const randId = crypto.randomUUID();
      const authData = [
        {
          user: { id: randId, username: 'foo', fullname: 'Foo Bar', profile: { id: randId } },
          token: 7,
        },
        {
          user: { id: 7, username: 'foo', fullname: 'Foo Bar', profile: { id: randId } },
          token: 'test_token',
        },
        {
          user: { id: randId, username: 'foo', fullname: 'Foo Bar', profile: { id: 7 } },
          token: 'test_token',
        },
        {
          user: { username: 'foo', fullname: 'Foo Bar', profile: { id: randId } },
          token: 'test_token',
        },
        {
          user: { id: randId, fullname: 'Foo Bar', profile: { id: randId } },
          token: 'test_token',
        },
        {
          user: { id: randId, username: 'foo', profile: { id: randId } },
          token: 'test_token',
        },
        {
          user: { id: randId, username: 'foo', fullname: 'Foo Bar' },
          token: 'test_token',
        },
        {
          user: { id: randId, username: 'foo', fullname: 'Foo Bar', profile: { id: randId } },
        },
        {
          token: 'test_token',
        },
      ];
      for (const data of authData) {
        expect(isAuthData(data)).toBe(false);
        expect(() => getValidAuthDataOrThrowServerError(data)).toThrow();
      }
    });
  });
});
