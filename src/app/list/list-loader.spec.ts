import { render, screen, RenderComponentOptions } from '@testing-library/angular';
import { userEvent } from '@testing-library/user-event';
import { ListLoader } from './list-loader';

const hasMoreMock = vi.fn(() => false);
const loadingMock = vi.fn(() => false);
const loadErrorMock = vi.fn(() => '');
const listSizeMock = vi.fn(() => 0);
const loadMock = vi.fn();

const renderComponent = ({ inputs, on, ...options }: RenderComponentOptions<ListLoader> = {}) => {
  return render(ListLoader, {
    inputs: {
      pluralLabel: 'Data',
      hasMore: hasMoreMock(),
      loading: loadingMock(),
      loadError: loadErrorMock(),
      listSize: listSizeMock(),
      ...inputs,
    },
    on: { loaded: loadMock, ...on },
    ...options,
  });
};

describe('ListLoader', () => {
  afterEach(vi.resetAllMocks);

  it('should create', async () => {
    const { fixture } = await renderComponent();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should display a data loading indicator', async () => {
    loadingMock.mockImplementation(() => true);
    await renderComponent();
    expect(screen.getByLabelText(/Loading data/)).toBeVisible();
    expect(screen.queryByRole('button', { name: /retry/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /load more/i })).toBeNull();
    expect(screen.queryByLabelText(/Loading more/)).toBeNull();
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('should display an error message and a retry button that reloads the data', async () => {
    const errMsg = 'Test error';
    loadErrorMock.mockImplementation(() => errMsg);
    const { click } = userEvent.setup();
    await renderComponent();
    loadMock.mockClear();
    await click(screen.getByRole('button', { name: /retry/i }));
    expect(screen.getByText(errMsg)).toBeVisible();
    expect(screen.getByRole('button', { name: /retry/i })).toBeVisible();
    expect(screen.queryByRole('button', { name: /load more/i })).toBeNull();
    expect(screen.queryByLabelText(/Loading data/)).toBeNull();
    expect(screen.queryByLabelText(/Loading more/)).toBeNull();
    expect(screen.queryByRole('menu')).toBeNull();
    expect(loadMock).toHaveBeenCalledOnce();
  });

  it('should display a data loading indicator on loading more', async () => {
    loadingMock.mockImplementation(() => true);
    hasMoreMock.mockImplementation(() => true);
    listSizeMock.mockImplementation(() => 1);
    await renderComponent();
    expect(screen.getByLabelText(/Loading more/)).toBeVisible();
    expect(screen.queryByLabelText(/Loading data/)).toBeNull();
    expect(screen.queryByRole('button', { name: /load more/i })).toBeNull();
  });

  it('should display load-more button that invoke load method', async () => {
    listSizeMock.mockImplementation(() => 1);
    hasMoreMock.mockImplementation(() => true);
    const { click } = userEvent.setup();
    await renderComponent();
    loadMock.mockClear();
    const loadMoreBtn = screen.getByRole('button', { name: /load more/i });
    await click(loadMoreBtn);
    expect(loadMoreBtn).toBeVisible();
    expect(loadMock).toHaveBeenCalledOnce();
    expect(screen.queryByLabelText(/Loading more/)).toBeNull();
    expect(screen.queryByLabelText(/Loading data/)).toBeNull();
  });

  it('should display load error and a retry-button that reloads more data', async () => {
    const errMsg = 'Test error';
    loadErrorMock.mockImplementation(() => errMsg);
    hasMoreMock.mockImplementation(() => true);
    listSizeMock.mockImplementation(() => 1);
    const { click } = userEvent.setup();
    await renderComponent();
    loadMock.mockClear();
    await click(screen.getByRole('button', { name: /retry/i }));
    expect(screen.getByText(errMsg)).toBeVisible();
    expect(loadMock).toHaveBeenCalledOnce();
    expect(screen.queryByLabelText(/Loading more/)).toBeNull();
    expect(screen.queryByLabelText(/Loading data/)).toBeNull();
    expect(screen.queryByRole('button', { name: /load more/i })).toBeNull();
  });
});
