import { render, RenderComponentOptions, screen } from '@testing-library/angular';
import { userEvent } from '@testing-library/user-event';
import { ChatList } from './chat-list';
import { User } from '../chats.types';
import { Chats } from '../chats';

const chatsMock = {
  load: vi.fn(),
  reset: vi.fn(),
  loadError: vi.fn(() => ''),
  loading: vi.fn(() => false),
  hasMore: vi.fn(() => false),
  generateTitle: vi.fn(() => ''),
  list: vi.fn<() => unknown[]>(() => []),
};

const chats = [
  { id: crypto.randomUUID(), messages: [{ body: 'Hi!' }] },
  { id: crypto.randomUUID(), messages: [{ body: 'Hi!' }] },
];

const user = { id: crypto.randomUUID() } as User;

const renderComponent = ({
  providers,
  inputs,
  ...options
}: RenderComponentOptions<ChatList> = {}) => {
  return render(ChatList, {
    providers: [{ provide: Chats, useValue: chatsMock }, ...(providers || [])],
    inputs: { user, ...inputs },
    ...options,
  });
};

describe('ChatList', () => {
  afterEach(vi.resetAllMocks);

  it('should reset and load the chats on every render', async () => {
    const { rerender } = await renderComponent();
    await rerender();
    await rerender();
    expect(chatsMock.load).toHaveBeenCalledTimes(3);
    expect(chatsMock.reset).toHaveBeenCalledTimes(3);
  });

  it('should display a list of named chats', async () => {
    const title = 'Test chat title';
    chatsMock.list.mockImplementation(() => chats);
    chatsMock.generateTitle.mockImplementation(() => title);
    await renderComponent();
    const chatLinks = screen.getAllByRole('link', {
      name: new RegExp(title),
    }) as HTMLAnchorElement[];
    expect(screen.getByRole('menu', { name: /chat list/i })).toBeVisible();
    expect(screen.queryByRole('button', { name: /load more/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /retry/i })).toBeNull();
    expect(screen.queryByLabelText(/loading chats/i)).toBeNull();
    expect(screen.queryByLabelText(/loading more/i)).toBeNull();
    expect(chatLinks).toHaveLength(chats.length);
    for (let i = 0; i < chatLinks.length; i++) {
      expect(chatLinks[i].href).toMatch(new RegExp(`chats/${chats[i].id}$`));
    }
  });

  it('should display a list of anonymous chats', async () => {
    chatsMock.list.mockImplementation(() => chats);
    await renderComponent();
    const chatLinks = screen.getAllByRole('link', { name: /anonymous/i }) as HTMLAnchorElement[];
    expect(screen.getByRole('menu', { name: /chat list/i })).toBeVisible();
    expect(screen.queryByRole('button', { name: /load more/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /retry/i })).toBeNull();
    expect(screen.queryByLabelText(/loading chats/i)).toBeNull();
    expect(screen.queryByLabelText(/loading more/i)).toBeNull();
    expect(chatLinks).toHaveLength(chats.length);
    for (let i = 0; i < chatLinks.length; i++) {
      expect(chatLinks[i].href).toMatch(new RegExp(`chats/${chats[i].id}$`));
    }
  });

  it('should display a chats loading indicator', async () => {
    chatsMock.loading.mockImplementation(() => true);
    await renderComponent();
    expect(screen.getByLabelText(/loading chats/i)).toBeVisible();
    expect(screen.queryByRole('button', { name: /retry/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /load more/i })).toBeNull();
    expect(screen.queryByLabelText(/loading more/i)).toBeNull();
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('should display an error message and a retry button that reloads the chats', async () => {
    const errMsg = 'Test error';
    chatsMock.loadError.mockImplementation(() => errMsg);
    const { click } = userEvent.setup();
    await renderComponent();
    chatsMock.load.mockClear();
    await click(screen.getByRole('button', { name: /retry/i }));
    expect(screen.getByText(errMsg)).toBeVisible();
    expect(screen.getByRole('button', { name: /retry/i })).toBeVisible();
    expect(screen.queryByRole('button', { name: /load more/i })).toBeNull();
    expect(screen.queryByLabelText(/loading chats/i)).toBeNull();
    expect(screen.queryByLabelText(/loading more/i)).toBeNull();
    expect(screen.queryByRole('menu')).toBeNull();
    expect(chatsMock.load).toHaveBeenCalledOnce();
  });

  it('should invoke the load-more method automatically if can load more', async () => {
    chatsMock.list.mockImplementation(() => chats);
    chatsMock.hasMore.mockImplementation(() => true);
    await renderComponent();
    expect(chatsMock.load).toHaveBeenCalled();
  });

  it('should display load-more button that invoke load-more method', async () => {
    chatsMock.list.mockImplementation(() => chats);
    chatsMock.hasMore.mockImplementation(() => true);
    const { click } = userEvent.setup();
    await renderComponent();
    chatsMock.load.mockClear();
    const loadMoreBtn = screen.getByRole('button', { name: /load more/i });
    await click(loadMoreBtn);
    expect(loadMoreBtn).toBeVisible();
    expect(chatsMock.load).toHaveBeenCalledOnce();
    expect(screen.queryByLabelText(/loading more/i)).toBeNull();
    expect(screen.queryByLabelText(/loading chats/i)).toBeNull();
  });

  it('should display load-more error and a retry-button that reloads more chats', async () => {
    const errMsg = 'Test error';
    chatsMock.loadError.mockImplementation(() => errMsg);
    chatsMock.hasMore.mockImplementation(() => true);
    chatsMock.list.mockImplementation(() => chats);
    const { click } = userEvent.setup();
    await renderComponent();
    chatsMock.load.mockClear();
    await click(screen.getByRole('button', { name: /retry/i }));
    expect(screen.getByText(errMsg)).toBeVisible();
    expect(chatsMock.load).toHaveBeenCalledOnce();
    expect(screen.queryByLabelText(/loading more/i)).toBeNull();
    expect(screen.queryByLabelText(/loading chats/i)).toBeNull();
    expect(screen.queryByRole('button', { name: /load more/i })).toBeNull();
  });

  it('should display loading-more indicator', async () => {
    chatsMock.loading.mockImplementation(() => true);
    chatsMock.hasMore.mockImplementation(() => true);
    chatsMock.list.mockImplementation(() => chats);
    await renderComponent();
    expect(screen.getByLabelText(/loading more/i)).toBeVisible();
    expect(screen.queryByLabelText(/loading chats/i)).toBeNull();
    expect(screen.queryByRole('button', { name: /load more/i })).toBeNull();
  });
});
