import { RouterTestingHarness } from '@angular/router/testing';
import { Router, UrlTree } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { Navigation } from './navigation';

const setup = async () => {
  TestBed.configureTestingModule({});
  const routerHarness = await RouterTestingHarness.create();
  const service = TestBed.inject(Navigation);
  const router = TestBed.inject(Router);
  return { router, service, routerHarness };
};

describe('Navigation', () => {
  it('should have the expected initial state', async () => {
    const { service } = await setup();
    expect(service.error()).toBeNull();
    expect(service.current()).toBeNull();
    expect(service.isInitial()).toBe(true);
    expect(service.navigating()).toBe(false);
  });

  it('should have the current navigation while navigating', async () => {
    const { service, routerHarness } = await setup();
    const routerNavigation = routerHarness.navigateByUrl('/');
    const currentNavigation = service.current();
    expect(currentNavigation!.id).toBeTruthy();
    expect(currentNavigation!.previousNavigation).toBeNull();
    expect(currentNavigation!.initialUrl).toBeInstanceOf(UrlTree);
    expect(currentNavigation!.initialUrl.toString()).toBe('/');
    expect(service.navigating()).toBe(true);
    await routerNavigation;
  });

  it('should not have the current navigation after navigating', async () => {
    const { service, routerHarness } = await setup();
    await routerHarness.navigateByUrl('/');
    expect(service.navigating()).toBe(false);
    expect(service.current()).toBeNull();
  });

  it('should be an initial navigation until the first successful navigation', async () => {
    const { service, routerHarness } = await setup();
    const isInitialBeforeNavigating = service.isInitial();
    const routerNavigation = routerHarness.navigateByUrl('/');
    const isInitialWhileNavigating = service.isInitial();
    await routerNavigation;
    const isInitialAfterNavigating = service.isInitial();
    expect(isInitialBeforeNavigating).toBe(true);
    expect(isInitialWhileNavigating).toBe(true);
    expect(isInitialAfterNavigating).toBe(false);
  });

  it('should have an error after a failed navigation, and remains an initial navigation', async () => {
    const { service, routerHarness } = await setup();
    const randomUrl = '/blah';
    try {
      await routerHarness.navigateByUrl(randomUrl);
    } catch {
      expect(service.error()).toBeTruthy();
      expect(service.isInitial()).toBe(true);
      expect(service.error()!.url).toBe(randomUrl);
      expect(service.error()!.message).toMatch(/failed/i);
    }
  });

  it('should retry a failed navigating', async () => {
    const { service, router, routerHarness } = await setup();
    const routerSpy = vi.spyOn(router, 'navigateByUrl');
    const randomUrl = '/blah';
    try {
      await routerHarness.navigateByUrl(randomUrl);
    } catch {
      const navigationPromise = service.retry();
      expect(service.error()).toBeNull();
      await expect(navigationPromise).rejects.toThrowError();
      expect(service.error()).toBeTruthy();
      expect(service.isInitial()).toBe(true);
      expect(service.error()!.url).toBe(randomUrl);
      expect(service.error()!.message).toMatch(/failed/i);
      expect(routerSpy).toHaveBeenCalledTimes(2);
      expect(routerSpy.mock.calls[0][0]).toStrictEqual(routerSpy.mock.calls[1][0]);
    }
  });

  it('should remove the error after a successful navigation', async () => {
    const { service, router, routerHarness } = await setup();
    const routerSpy = vi.spyOn(router, 'navigateByUrl');
    try {
      await routerHarness.navigateByUrl('/blah');
    } catch {
      const navigationPromise = routerHarness.navigateByUrl('/');
      expect(service.error()).toBeNull();
      await expect(navigationPromise).resolves.toBeNull();
      expect(service.error()).toBeNull();
      expect(service.current()).toBeNull();
      expect(service.isInitial()).toBe(false);
      expect(service.navigating()).toBe(false);
      expect(routerSpy).toHaveBeenCalledTimes(2);
    }
  });
});
