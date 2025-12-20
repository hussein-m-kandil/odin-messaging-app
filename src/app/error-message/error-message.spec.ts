import { screen, render, RenderComponentOptions } from '@testing-library/angular';
import { userEvent } from '@testing-library/user-event';
import { ErrorMessage } from './error-message';

const renderComponent = (options: RenderComponentOptions<ErrorMessage> = {}) => {
  return render(ErrorMessage, options);
};

describe('ErrorMessage', () => {
  it('should render the given message, and a retry button', async () => {
    const retry = vi.fn();
    const message = 'Test error message';
    await renderComponent({ inputs: { message }, on: { retry } });
    expect(retry).toHaveBeenCalledTimes(0);
    expect(screen.getByText(message)).toBeVisible();
    expect(screen.getByRole('button', { name: /retry/i })).toBeVisible();
  });

  it('should emit a `retry` event on click the retry-button', async () => {
    const retry = vi.fn();
    const message = 'Test error message';
    const { click } = userEvent.setup();
    await renderComponent({ inputs: { message }, on: { retry } });
    await click(screen.getByRole('button', { name: /retry/i }));
    expect(retry).toHaveBeenCalledOnce();
  });
});
