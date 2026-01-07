import { render, RenderComponentOptions, screen } from '@testing-library/angular';
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
    expect(chatLinks).toHaveLength(chats.length);
    for (let i = 0; i < chatLinks.length; i++) {
      expect(chatLinks[i].href).toMatch(new RegExp(`chats/${chats[i].id}$`));
    }
  });

  it('should display a list of anonymous chats', async () => {
    chatsMock.list.mockImplementation(() => chats);
    await renderComponent();
    const chatLinks = screen.getAllByRole('link', { name: /anonymous/i }) as HTMLAnchorElement[];
    expect(chatLinks).toHaveLength(chats.length);
    for (let i = 0; i < chatLinks.length; i++) {
      expect(chatLinks[i].href).toMatch(new RegExp(`chats/${chats[i].id}$`));
    }
  });
});
