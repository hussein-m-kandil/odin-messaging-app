import {
  render,
  screen,
  RenderComponentOptions,
  waitForElementToBeRemoved,
} from '@testing-library/angular';
import { userEvent } from '@testing-library/user-event';
import { provideRouter, Router } from '@angular/router';
import { environment } from '../environments';
import { Component } from '@angular/core';
import { of, throwError } from 'rxjs';
import { Auth } from './auth';
import { App } from './app';

const consoleLogSpy = vi.spyOn(window.console, 'log');
const consoleErrorSpy = vi.spyOn(window.console, 'error');
const navigationSpy = vi.spyOn(Router.prototype, 'navigateByUrl');

const signOut = vi.fn();
const mockAuthService = vi.fn(() => ({ authenticated$: of(true), signOut }));

@Component({ template: '<h1>Test Component</h1>' })
class TestComponent {}

const resolve = { testData: vi.fn(() => of(null)) };

const renderComponent = ({ providers, ...options }: RenderComponentOptions<App> = {}) => {
  return render(App, {
    providers: [
      provideRouter([{ path: '**', component: TestComponent, resolve }]),
      { provide: Auth, useValue: mockAuthService() },
      ...(providers || []),
    ],
    ...options,
  });
};

describe('App', () => {
  afterEach(vi.resetAllMocks);

  it('should render title', async () => {
    await renderComponent();
    expect(screen.getByRole('heading', { name: new RegExp(environment.title, 'i') })).toBeVisible();
  });

  it('should show loader on navigation', async () => {
    await renderComponent();
    expect(screen.getByText(/loading/i)).toBeVisible();
  });

  it('should not show sign-out button for an unauthenticated user', async () => {
    mockAuthService.mockImplementationOnce(() => ({
      ...mockAuthService(),
      authenticated$: of(false),
    }));
    await renderComponent();
    await waitForElementToBeRemoved(screen.getByText(/loading/i));
    expect(screen.queryByRole('button', { name: /sign ?out/i })).toBeNull();
  });

  it('should show sign-out button for an authenticated user', async () => {
    mockAuthService.mockImplementationOnce(() => ({
      ...mockAuthService(),
      authenticated$: of(true),
    }));
    await renderComponent();
    await waitForElementToBeRemoved(screen.getByText(/loading/i));
    expect(screen.getByRole('button', { name: /sign ?out/i })).toBeVisible();
  });

  it('should call `signOut` function from the Auth service when clicking the sign-out button', async () => {
    mockAuthService.mockImplementationOnce(() => ({
      ...mockAuthService(),
      authenticated$: of(true),
    }));
    const user = userEvent.setup();
    await renderComponent();
    await waitForElementToBeRemoved(screen.getByText(/loading/i));
    await user.click(screen.getByRole('button', { name: /sign ?out/i }));
    expect(signOut).toHaveBeenCalledOnce();
  });

  it('should show a navigation error message and a retry button', async () => {
    resolve.testData.mockImplementationOnce(() =>
      throwError(() => new Error('Test resolve error'))
    );
    consoleErrorSpy.mockImplementationOnce(() => undefined);
    consoleLogSpy.mockImplementationOnce(() => undefined);
    await renderComponent({
      configureTestBed: (testbed) => {
        testbed.configureTestingModule({ rethrowApplicationErrors: false });
      },
    });
    await waitForElementToBeRemoved(screen.getByText(/loading/i));
    expect(screen.getByText(/failed to load/i));
    expect(screen.getByRole('button', { name: /retry/i }));
  });

  it('should navigate to same url again when clicking retry, after a navigation error', async () => {
    resolve.testData.mockImplementationOnce(() =>
      throwError(() => new Error('Test resolve error'))
    );
    consoleErrorSpy.mockImplementationOnce(() => undefined);
    consoleLogSpy.mockImplementationOnce(() => undefined);
    const user = userEvent.setup();
    await renderComponent({
      configureTestBed: (testbed) => {
        testbed.configureTestingModule({ rethrowApplicationErrors: false });
      },
    });
    await waitForElementToBeRemoved(screen.getByText(/loading/i));
    await user.click(screen.getByRole('button', { name: /retry/i }));
    await waitForElementToBeRemoved(screen.getByText(/loading/i));
    expect(screen.queryByRole('button', { name: /retry/i })).toBeNull();
    expect(navigationSpy).toHaveBeenCalledExactlyOnceWith('/');
    expect(screen.queryByText(/failed to load/i)).toBeNull();
  });
});
