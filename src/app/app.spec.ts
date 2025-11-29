import { render, screen } from '@testing-library/angular';
import { provideRouter } from '@angular/router';
import { environment } from '../environments';
import { App } from './app';

const renderComponent = () => {
  return render(App, {
    providers: [provideRouter([])],
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
});
