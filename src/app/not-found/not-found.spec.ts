import { render, RenderComponentOptions, screen } from '@testing-library/angular';
import { NotFound } from './not-found';

const renderComponent = (options: RenderComponentOptions<NotFound> = {}) => {
  return render(NotFound, options);
};

describe('NotFound', () => {
  it('should display a not-found message', async () => {
    await renderComponent();
    expect(screen.getByText(/not found/i)).toBeVisible();
  });
});
