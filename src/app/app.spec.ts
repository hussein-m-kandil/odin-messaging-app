import {
  render,
  screen,
  getByRole,
  RenderComponentOptions,
  waitForElementToBeRemoved,
} from '@testing-library/angular';
import { userEvent } from '@testing-library/user-event';
import { environment } from '../environments';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { Auth } from './auth';
import { App } from './app';
import { Component } from '@angular/core';

const consoleLogSpy = vi.spyOn(window.console, 'log');
const consoleErrorSpy = vi.spyOn(window.console, 'error');
const navigationSpy = vi.spyOn(Router.prototype, 'navigateByUrl');

const user = { id: crypto.randomUUID() };

const signOut = vi.fn();
const userMock = vi.fn<() => unknown>(() => user);
const authMock = vi.fn(() => ({ user: userMock, signOut }));

const resolve = { testData: vi.fn(() => of(null)) };

@Component({ selector: 'app-test-component', template: `<div>{{ title }}</div>` })
class component {
  static TITLE = 'Test Chat List';
  protected title = component.TITLE;
}

const renderComponent = ({ providers, ...options }: RenderComponentOptions<App> = {}) => {
  return render(App, {
    providers: [
      provideRouter([{ path: '**', resolve, component }]),
      { provide: Auth, useValue: authMock() },
      ...(providers || []),
    ],
    ...options,
  });
};

describe('App', () => {
  afterEach(vi.resetAllMocks);

  it('should render the title', async () => {
    await renderComponent();
    const heading = screen.getByRole('heading', { name: new RegExp(environment.title, 'i') });
    expect(heading).toBeVisible();
    expect(getByRole(heading, 'link')).toHaveAttribute('href', '/');
  });

  it('should show loader on navigation', async () => {
    await renderComponent();
    expect(screen.getByLabelText(/loading/i)).toBeVisible();
  });

  it('should not show sign-out button for an unauthenticated user', async () => {
    userMock.mockImplementation(() => null);
    await renderComponent();
    await waitForElementToBeRemoved(screen.getByLabelText(/loading/i));
    expect(screen.queryByRole('button', { name: /sign ?out/i })).toBeNull();
  });

  it('should show sign-out button for an authenticated user', async () => {
    await renderComponent();
    await waitForElementToBeRemoved(screen.getByLabelText(/loading/i));
    expect(screen.getByRole('button', { name: /sign ?out/i })).toBeVisible();
  });

  it('should call `signOut` function from the Auth service when clicking the sign-out button', async () => {
    const user = userEvent.setup();
    await renderComponent();
    await waitForElementToBeRemoved(screen.getByLabelText(/loading/i));
    await user.click(screen.getByRole('button', { name: /sign ?out/i }));
    expect(signOut).toHaveBeenCalledOnce();
    // expect(screen.getByText(/bye/)).toBeVisible();
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
    await waitForElementToBeRemoved(screen.getByLabelText(/loading/i));
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
    await waitForElementToBeRemoved(screen.getByLabelText(/loading/i));
    await user.click(screen.getByRole('button', { name: /retry/i }));
    await waitForElementToBeRemoved(screen.getByLabelText(/loading/i));
    expect(screen.queryByRole('button', { name: /retry/i })).toBeNull();
    expect(navigationSpy).toHaveBeenCalledExactlyOnceWith('/');
    expect(screen.queryByText(/failed to load/i)).toBeNull();
  });
});
