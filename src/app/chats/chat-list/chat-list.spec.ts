import { render, RenderComponentOptions, screen } from '@testing-library/angular';
import { Profile, User } from '../../app.types';
import { DatePipe } from '@angular/common';
import { ChatList } from './chat-list';
import { Chat } from '../chats.types';
import { Auth } from '../../auth';
import { Observable } from 'rxjs';
import { Chats } from '../chats';

const chatsMock = {
  load: vi.fn(),
  updateChats: vi.fn(),
  loadError: vi.fn(() => ''),
  loading: vi.fn(() => false),
  hasMore: vi.fn(() => false),
  generateTitle: vi.fn(() => ''),
  list: vi.fn(() => [] as unknown[]),
  getOtherProfiles: vi.fn(() => [] as unknown[]),
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
  { ...chat, id: crypto.randomUUID(), messages: [{ body: 'Yo!' }] },
  { ...chat, id: crypto.randomUUID(), messages: [{ body: 'Bye!' }] },
];

const authMock = { user: vi.fn(() => user), userUpdated: new Observable() };

const renderComponent = ({ providers, ...options }: RenderComponentOptions<ChatList> = {}) => {
  return render(ChatList, {
    providers: [
      { provide: Chats, useValue: chatsMock },
      { provide: Auth, useValue: authMock },
      ...(providers || []),
    ],
    autoDetectChanges: false,
    ...options,
  });
};

describe('ChatList', () => {
  afterEach(vi.resetAllMocks);

  it('should load the chats, and not update it', async () => {
    chatsMock.list.mockImplementation(() => []);
    await renderComponent();
    expect(chatsMock.load).toHaveBeenCalledTimes(1);
    expect(chatsMock.updateChats).toHaveBeenCalledTimes(0);
  });

  it('should not load/update the chats', async () => {
    chatsMock.list.mockImplementation(() => chats);
    const { rerender } = await renderComponent();
    await rerender({ partialUpdate: true });
    await rerender({ partialUpdate: true });
    expect(chatsMock.load).toHaveBeenCalledTimes(0);
    expect(chatsMock.updateChats).toHaveBeenCalledTimes(0);
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
    expect(screen.getAllByText(/\d/i).length).toBeGreaterThan(0);
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
    expect(screen.queryByText(/\d/i)).toBeNull();
  });

  it('should a chat have a formatted date', async () => {
    const dayMS = 24 * 60 * 60 * 1000;
    const nowMS = new Date().getTime();
    const testChats = [
      { ...chat, messages: [{ body: 'Hi!', createdAt: new Date().toISOString() }] },
      {
        ...chat,
        id: crypto.randomUUID(),
        messages: [{ body: 'Yo!', createdAt: new Date(nowMS - dayMS).toISOString() }],
      },
      {
        ...chat,
        id: crypto.randomUUID(),
        messages: [{ body: 'Bye!', createdAt: new Date(nowMS - dayMS * 2).toISOString() }],
      },
    ];
    const expectedDates = [
      new DatePipe('en-US').transform(testChats[0].messages[0].createdAt, 'shortTime')!,
      'Yesterday',
      new DatePipe('en-US').transform(testChats[2].messages[0].createdAt, 'mediumDate')!,
    ];
    chatsMock.list.mockImplementation(() => testChats);
    await renderComponent();
    const timeElements = screen.getAllByRole('time');
    expect(timeElements).toHaveLength(expectedDates.length);
    for (let i = 0; i < timeElements.length; i++) {
      const time = timeElements[i];
      expect(time).toBeVisible();
      expect(time.textContent.trim()).toBe(expectedDates[i]);
    }
  });
});
