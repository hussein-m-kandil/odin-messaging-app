import { render, RenderComponentOptions, screen } from '@testing-library/angular';
import { userEvent } from '@testing-library/user-event';
import { Navigation } from '../navigation';
import { Navigator } from './navigator';

const navigationMock = { error: vi.fn(), retry: vi.fn() };

const renderComponent = ({ providers, ...options }: RenderComponentOptions<Navigator> = {}) => {
  return render(Navigator, {
    providers: [{ provide: Navigation, useValue: navigationMock }, ...(providers || [])],
    ...options,
  });
};

describe('Navigator', () => {
  afterEach(vi.resetAllMocks);

  it('should render a spinner with the default label', async () => {
    await renderComponent();
    expect(screen.getByLabelText(/loading/i)).toBeVisible();
  });

  it('should render a spinner with the given label', async () => {
    const label = 'Test label';
    await renderComponent({ inputs: { label } });
    expect(screen.getByLabelText(label)).toBeVisible();
  });

  it('should an error message and a retry button', async () => {
    const error = { message: 'Test error message', url: '/' };
    navigationMock.error.mockImplementation(() => error);
    await renderComponent();
    expect(screen.queryByLabelText(/loading/i)).toBeNull();
    expect(screen.getByText(error.message)).toBeVisible();
    expect(screen.getByRole('button', { name: /retry/i })).toBeVisible();
  });

  it('should retry navigating', async () => {
    const { click } = userEvent.setup();
    const error = { message: 'Test error message', url: '/' };
    navigationMock.error.mockImplementation(() => error);
    await renderComponent({ autoDetectChanges: false });
    await click(screen.getByRole('button', { name: /retry/i }));
    expect(screen.queryByLabelText(/loading/i)).toBeNull();
    expect(screen.getByText(error.message)).toBeVisible();
    expect(navigationMock.retry).toHaveBeenCalledOnce();
  });
});
