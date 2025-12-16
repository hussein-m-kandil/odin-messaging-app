import {
  UrlSegment,
  CanActivateFn,
  RedirectCommand,
  RouterStateSnapshot,
  ActivatedRouteSnapshot,
} from '@angular/router';
import { firstValueFrom, Observable, of } from 'rxjs';
import { TestBed } from '@angular/core/testing';
import { authGuard } from './auth-guard';
import { Auth } from './auth';

const mockAuthService = vi.fn(() => ({ authenticated$: of(true) }));

const setup = () => {
  TestBed.configureTestingModule({ providers: [{ provide: Auth, useValue: mockAuthService() }] });
  const executeGuard: CanActivateFn = (...guardParameters) => {
    return TestBed.runInInjectionContext(() => authGuard(...guardParameters));
  };
  return { executeGuard };
};

const getGuardParameters = (routeUrl: Partial<UrlSegment>[] = [], stateUrl = '/') => {
  const route = { url: routeUrl } as ActivatedRouteSnapshot;
  const state = { url: stateUrl } as RouterStateSnapshot;
  return [route, state] as const;
};

describe('authGuard', () => {
  it('should return an observable', () => {
    const { executeGuard } = setup();
    const result = executeGuard(...getGuardParameters());
    expect(result).toBeInstanceOf(Observable);
  });

  it('should allow an authenticated user to visit a non-auth URL', async () => {
    mockAuthService.mockImplementation(() => ({ authenticated$: of(true) }));
    const { executeGuard } = setup();
    const routeUrls: Partial<UrlSegment>[][] = [
      [],
      [{ path: '' }],
      [{ path: 'foo' }],
      [{ path: 'bar' }, { path: 'tar' }],
    ];
    for (const url of routeUrls) {
      const guardParameters = getGuardParameters(url);
      const result = await firstValueFrom(executeGuard(...guardParameters) as Observable<boolean>);
      expect(result).toBe(true);
    }
    mockAuthService.mockReset();
  });

  it('should disallow an authenticated user to visit an auth URL', async () => {
    mockAuthService.mockImplementation(() => ({ authenticated$: of(true) }));
    const { executeGuard } = setup();
    const routeUrls: Partial<UrlSegment>[][] = [
      [{ path: 'signin' }],
      [{ path: 'signup' }],
      [{ path: 'blah' }, { path: 'signin' }],
      [{ path: 'blah' }, { path: 'signup' }],
    ];
    for (const url of routeUrls) {
      const stateUrl = `/xyz/${crypto.randomUUID()}`;
      const guardParameters = getGuardParameters(url, stateUrl);
      const result = await firstValueFrom(
        executeGuard(...guardParameters) as Observable<RedirectCommand>
      );
      expect(result).toBeInstanceOf(RedirectCommand);
      expect(result.redirectTo.toString()).toBe('/chats');
      expect(result.redirectTo.queryParams).toStrictEqual({});
    }
    mockAuthService.mockReset();
  });

  it('should allow an unauthenticated user to visit an auth URL', async () => {
    mockAuthService.mockImplementation(() => ({ authenticated$: of(false) }));
    const { executeGuard } = setup();

    const routeUrls: Partial<UrlSegment>[][] = [
      [{ path: 'signin' }],
      [{ path: 'signup' }],
      [{ path: 'blah' }, { path: 'signin' }],
      [{ path: 'blah' }, { path: 'signup' }],
    ];
    for (const url of routeUrls) {
      const guardParameters = getGuardParameters(url);
      const result = await firstValueFrom(executeGuard(...guardParameters) as Observable<boolean>);
      expect(result).toBe(true);
    }
    mockAuthService.mockReset();
  });

  it('should disallow an unauthenticated user to visit a non-auth URL', async () => {
    mockAuthService.mockImplementation(() => ({ authenticated$: of(false) }));
    const { executeGuard } = setup();
    const routeUrls: Partial<UrlSegment>[][] = [
      [],
      [{ path: '' }],
      [{ path: 'foo' }],
      [{ path: 'bar' }, { path: 'tar' }],
    ];
    for (const url of routeUrls) {
      const stateUrl = `/xyz/${crypto.randomUUID()}`;
      const guardParameters = getGuardParameters(url, stateUrl);
      const result = await firstValueFrom(
        executeGuard(...guardParameters) as Observable<RedirectCommand>
      );
      expect(result).toBeInstanceOf(RedirectCommand);
      expect(result.redirectTo.toString()).toMatch(/\/signin\?.*$/);
      expect(result.redirectTo.queryParams).toStrictEqual({ url: stateUrl });
    }
    mockAuthService.mockReset();
  });
});
