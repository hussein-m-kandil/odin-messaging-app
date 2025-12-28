import { render, screen, getByRole, RenderComponentOptions } from '@testing-library/angular';
import { userEvent } from '@testing-library/user-event';
import { provideRouter, Router } from '@angular/router';
import { ColorScheme, SCHEMES } from './color-scheme';
import { environment } from '../environments';
import { Component } from '@angular/core';
import { of, throwError } from 'rxjs';
import { Auth } from './auth';
import { App } from './app';

const consoleLogSpy = vi.spyOn(window.console, 'log');
const consoleErrorSpy = vi.spyOn(window.console, 'error');
const navigationSpy = vi.spyOn(Router.prototype, 'navigateByUrl');

const user = { id: crypto.randomUUID() };

const signOut = vi.fn();
const userMock = vi.fn<() => unknown>(() => user);
const authMock = vi.fn(() => ({ user: userMock, signOut }));

const scheme = SCHEMES[1];
const colorSchemeMock = { scheme: vi.fn(() => scheme), switch: vi.fn() };

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
      { provide: ColorScheme, useValue: colorSchemeMock },
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
    expect(screen.queryByRole('button', { name: /sign ?out/i })).toBeNull();
  });

  it('should show sign-out button for an authenticated user', async () => {
    await renderComponent();
    expect(screen.getByRole('button', { name: /sign ?out/i })).toBeVisible();
  });

  it('should call `signOut` function from the Auth service when clicking the sign-out button', async () => {
    const user = userEvent.setup();
    await renderComponent({ autoDetectChanges: false });
    await user.click(screen.getByRole('button', { name: /sign ?out/i }));
    expect(signOut).toHaveBeenCalledOnce();
    expect(screen.getByText(/bye/i)).toBeVisible();
  });

  it('should show color-scheme switch that indicate to the current color theme', async () => {
    await renderComponent();
    expect(
      screen.getByRole('button', {
        name: new RegExp(`switch color scheme. ${scheme.value} selected`, 'i'),
      })
    ).toBeVisible();
  });

  it('should switch the color scheme on click the color-scheme switch', async () => {
    const { click } = userEvent.setup();
    await renderComponent({ autoDetectChanges: false });
    await click(screen.getByRole('button', { name: /switch color scheme/i }));
    expect(colorSchemeMock.switch).toHaveBeenCalledOnce();
  });

  it('should show a navigation error message and a retry button', async () => {
    resolve.testData.mockImplementationOnce(() =>
      throwError(() => new Error('Test resolve error'))
    );
    consoleErrorSpy.mockImplementationOnce(() => undefined);
    consoleLogSpy.mockImplementationOnce(() => undefined);
    await renderComponent({
      autoDetectChanges: false,
      configureTestBed: (testbed) => {
        testbed.configureTestingModule({ rethrowApplicationErrors: false });
      },
    });
    await vi.waitFor(() => expect(screen.queryByLabelText(/loading/i)).toBeNull());
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
      autoDetectChanges: false,
      configureTestBed: (testbed) => {
        testbed.configureTestingModule({ rethrowApplicationErrors: false });
      },
    });
    await vi.waitFor(() => expect(screen.queryByLabelText(/loading/i)).toBeNull());
    await user.click(screen.getByRole('button', { name: /retry/i }));
    await vi.waitFor(() => expect(screen.queryByLabelText(/loading/i)).toBeNull());
    expect(screen.queryByRole('button', { name: /retry/i })).toBeNull();
    expect(navigationSpy).toHaveBeenCalledExactlyOnceWith('/');
    expect(screen.queryByText(/failed to load/i)).toBeNull();
  });
});
