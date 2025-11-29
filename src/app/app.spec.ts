import { render, screen, waitForElementToBeRemoved } from '@testing-library/angular';
import { userEvent } from '@testing-library/user-event';
import { provideRouter } from '@angular/router';
import { environment } from '../environments';
import { Auth } from './auth';
import { App } from './app';
import { of } from 'rxjs';

const signOut = vi.fn();
const mockAuthService = vi.fn(() => ({ authenticated$: of(true), signOut }));

const renderComponent = () => {
  return render(App, {
    providers: [{ provide: Auth, useValue: mockAuthService() }, provideRouter([])],
  });
};

describe('App', () => {
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
});
