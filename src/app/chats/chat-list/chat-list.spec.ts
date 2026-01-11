import { render, RenderComponentOptions, screen } from '@testing-library/angular';
import { Profile, User } from '../../app.types';
import { ChatList } from './chat-list';
import { Chat } from '../chats.types';
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

const now = new Date().toISOString();
const profile = {
  id: crypto.randomUUID(),
  tangible: true,
  lastSeen: now,
  visible: true,
} as Profile;
const user: User = {
  bio: 'From the testing with love',
  id: crypto.randomUUID(),
  username: 'test_user',
  fullname: 'Test User',
  createdAt: now,
  updatedAt: now,
  isAdmin: false,
  profile,
};
profile.user = user;

const profile2 = { ...profile, id: crypto.randomUUID() } as Profile;
const user2: User = {
  ...user,
  profile: profile2,
  id: crypto.randomUUID(),
  username: 'test_user_2',
  fullname: 'Test User II',
};
profile2.user = user2;

const chatId = crypto.randomUUID();
const chat: Chat = {
  profiles: [
    { profileName: user.username, profileId: profile.id, joinedAt: now, profile, chatId },
    {
      profileName: user2.username,
      profileId: profile2.id,
      profile: profile2,
      joinedAt: now,
      chatId,
    },
  ],
  createdAt: now,
  updatedAt: now,
  managers: [],
  messages: [],
  id: chatId,
};

const chats = [
  { ...chat, messages: [{ body: 'Hi!' }] },
  { ...chat, id: crypto.randomUUID(), messages: [{ body: 'Hi!' }] },
];

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

  it('should have some new-messages badges', async () => {
    chatsMock.list.mockImplementation(() => chats);
    await renderComponent();
    expect(screen.getAllByLabelText(/new messages/i).length).toBeGreaterThan(0);
  });

  it('should not have any new-messages badges', async () => {
    const lastReceivedAt = new Date(Date.now() + 7).toISOString();
    const lastSeenAt = lastReceivedAt;
    const updatedChats = chats.map((c) => ({
      ...c,
      profiles: c.profiles.map((cp) => ({ ...cp, lastReceivedAt, lastSeenAt })),
    }));
    chatsMock.list.mockImplementation(() => updatedChats);
    await renderComponent();
    expect(screen.queryByLabelText(/new messages/i)).toBeNull();
  });
});
