import { render, RenderComponentOptions, screen } from '@testing-library/angular';
import { NotFound } from './not-found';

const renderComponent = (options: RenderComponentOptions<NotFound> = {}) => {
  return render(NotFound, options);
};

describe('NotFound', () => {
  it('should display 404 and a not-found message', async () => {
    await renderComponent();
    expect(screen.getByText(/404/)).toBeVisible();
    expect(screen.getByText(/not found/i)).toBeVisible();
  });

  it('should display a back-to-home link', async () => {
    await renderComponent();
    const homeLink = screen.getByRole('link', { name: /back/ });
    expect(homeLink).toBeVisible();
    expect(homeLink).toHaveAttribute('href', '/');
  });
});
