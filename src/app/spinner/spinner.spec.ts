import { render, screen, RenderComponentOptions } from '@testing-library/angular';
import { Spinner } from './spinner';

const renderComponent = (options: RenderComponentOptions<Spinner> = {}) => {
  return render(Spinner, options);
};

describe('Spinner', () => {
  it('should have a label of `loading` by default', async () => {
    await renderComponent();
    expect(screen.getByLabelText(/loading/i)).toBeVisible();
  });

  it('should have the given label', async () => {
    const ariaLabel = 'Test loading spinner...';
    await renderComponent({ inputs: { ariaLabel } });
    expect(screen.getByLabelText(ariaLabel)).toBeVisible();
  });
});
