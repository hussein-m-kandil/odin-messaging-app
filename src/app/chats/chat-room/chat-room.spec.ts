import { render, RenderComponentOptions } from '@testing-library/angular';
import { userEvent } from '@testing-library/user-event';
import { User, Profile } from '../../app.types';
import { Chat, Message } from '../chats.types';
import { screen } from '@testing-library/dom';
import { MessageService } from 'primeng/api';
import { Profiles } from '../../profiles';
import { Router } from '@angular/router';
import { ChatRoom } from './chat-room';
import { Observable, of } from 'rxjs';
import { Messages } from './messages';

const user = { id: crypto.randomUUID(), username: 'test_user_1' } as User;
const profile = { id: crypto.randomUUID() } as Profile;
user.profile = profile;
profile.user = user;

const chatId = crypto.randomUUID();
const now = new Date().toISOString();
const image = { id: crypto.randomUUID(), width: 30, height: 20, alt: 'img', src: './img.png' };
const image2 = { ...image, id: crypto.randomUUID(), alt: 'img2', src: './img2.png' };
const messages: Message[] = [
  {
    chatId,
    body: 'Hi!',
    createdAt: now,
    updatedAt: now,
    id: crypto.randomUUID(),
    profileName: user.username,
    image: image as Message['image'],
    imageId: image.id,
  },
  {
    chatId,
    body: 'Bye!',
    createdAt: now,
    updatedAt: now,
    id: crypto.randomUUID(),
    profileName: 'test_user_2',
  },
  {
    chatId,
    body: '',
    createdAt: now,
    updatedAt: now,
    id: crypto.randomUUID(),
    profileName: 'test_user_2',
    image: image2 as Message['image'],
    imageId: image2.id,
  },
];

const chat = {
  id: chatId,
  messages,
  profiles: [
    {
      lastReceivedAt: null,
      lastSeenAt: null,
      profileId: crypto.randomUUID(),
      profileName: messages[0].profileName,
    },
    {
      lastReceivedAt: null,
      lastSeenAt: null,
      profileId: crypto.randomUUID(),
      profileName: messages[1].profileName,
    },
  ],
} as Chat;

const navigationSpy = vi.spyOn(Router.prototype, 'navigateByUrl');

HTMLElement.prototype.scrollBy = vi.fn();

const messagesMock = {
  hasBeenReceived: vi.fn(() => false),
  loadingRecent: vi.fn(() => false),
  loadRecentError: vi.fn(() => ''),
  hasBeenSeen: vi.fn(() => false),
  loadRecent: vi.fn<() => void>(),
  listUpdated: vi.fn(() => false),
  loading: vi.fn(() => false),
  hasMore: vi.fn(() => false),
  loadError: vi.fn(() => ''),
  load: vi.fn<() => void>(),
  init: vi.fn<() => void>(),
  reset: vi.fn<() => void>(),
  list: vi.fn(() => messages),
  chats: {
    isDeadChat: vi.fn<() => void>(),
    generateTitle: vi.fn<() => string>(),
    list: vi.fn<() => unknown[]>(() => []),
    getOtherProfiles: vi.fn<() => unknown[]>(() => []),
    createMessage: vi.fn<() => Observable<unknown>>(() => of({ id: crypto.randomUUID() })),
    getMessages: vi.fn<() => Observable<unknown[]>>(() => of([{ id: crypto.randomUUID() }])),
    getChat: vi.fn<() => Observable<unknown>>(() => of({ id: crypto.randomUUID(), messages: [] })),
  },
};

const profilesMock = { list: vi.fn<() => unknown[]>(() => []) };

const renderComponent = ({
  componentProviders,
  providers,
  ...options
}: RenderComponentOptions<ChatRoom> = {}) => {
  return render(ChatRoom, {
    providers: [
      MessageService,
      { provide: Profiles, useValue: profilesMock },
      ...(providers || []),
    ],
    componentProviders: [
      { provide: Messages, useValue: messagesMock },
      ...(componentProviders || []),
    ],
    autoDetectChanges: false,
    ...options,
  });
};

describe('ChatRoom', () => {
  afterEach(vi.resetAllMocks);

  it('should display a chat with messages, navbar, and message form', async () => {
    await renderComponent({ inputs: { user, chat, chatId } });
    expect(screen.getByRole('navigation')).toBeVisible();
    expect(screen.getByRole('button', { name: /update/i })).toBeVisible();
    expect(screen.getByRole('form', { name: /message/i })).toBeVisible();
    expect(screen.getByRole('link', { name: /back/i })).toBeVisible();
    expect(screen.getByLabelText(/sent/i)).toBeVisible();
    expect(screen.queryByLabelText(/seen/i)).toBeNull();
    expect(screen.queryByLabelText(/received/i)).toBeNull();
    expect(screen.queryByRole('button', { name: /try/i })).toBeNull();
    expect(screen.queryByLabelText(/updating/i)).toBeNull();
    expect(screen.queryByLabelText(/loading/i)).toBeNull();
    expect(screen.queryByText(/failed/i)).toBeNull();
    for (const msg of messages) {
      if (msg.body) expect(screen.getByText(msg.body)).toBeVisible();
      if (msg.image) expect(screen.getByRole('img', { name: msg.image.alt }));
    }
    expect(screen.getAllByRole('img')).toHaveLength(messages.filter((msg) => !!msg.image).length);
  });

  it('should display untitled chat', async () => {
    const regex = /untitled/i;
    await renderComponent({ inputs: { user, chat: null } });
    expect(screen.getByText(regex)).toBeVisible();
    expect(screen.queryByRole('link', { name: regex })).toBeNull();
    expect(screen.queryByText(profile.user.username)).toBeNull();
  });

  it('should display the given title as the chat title link', async () => {
    const title = 'Test Chat Title';
    messagesMock.chats.list.mockImplementation(() => [{ id: chatId }]);
    messagesMock.chats.generateTitle.mockImplementation(() => title);
    messagesMock.chats.getOtherProfiles.mockImplementation(() => [chat.profiles[0]]);
    await renderComponent({ inputs: { user, chat } });
    expect(screen.getByRole('link', { name: title })).toBeVisible();
    expect(screen.queryByText(profile.user.username)).toBeNull();
    expect(screen.queryByText(/untitled/i)).toBeNull();
  });

  it('should display the given title as the chat title text', async () => {
    const title = 'Test Chat Title';
    messagesMock.chats.list.mockImplementation(() => [{ id: chatId }]);
    messagesMock.chats.generateTitle.mockImplementation(() => title);
    await renderComponent({
      inputs: {
        user,
        chat: { ...chat, profiles: chat.profiles.map((cp) => ({ ...cp, profileId: null })) },
      },
    });
    expect(screen.getByText(title)).toBeVisible();
    expect(screen.queryByRole('link', { name: title })).toBeNull();
    expect(screen.queryByText(profile.user.username)).toBeNull();
    expect(screen.queryByText(/untitled/i)).toBeNull();
  });

  it('should display the profile name as the profile-chat title link', async () => {
    profilesMock.list.mockImplementation(() => [profile]);
    await renderComponent({ inputs: { user, chat: null, profileId: profile.id, profile } });
    expect(screen.getByRole('link', { name: profile.user.username })).toBeVisible();
    expect(screen.queryByText(/untitled/i)).toBeNull();
  });

  it('should display untitled profile-chat', async () => {
    profilesMock.list.mockImplementation(() => [profile]);
    await renderComponent({ inputs: { user, chat: null, profileId: profile.id, profile: null } });
    expect(screen.getByText(/untitled/i)).toBeVisible();
    expect(screen.queryByText(profile.user.username)).toBeNull();
  });

  it('should prefer to display the given title as the profile-chat title, event if the profile presence', async () => {
    const title = 'Test Chat Title';
    messagesMock.chats.list.mockImplementation(() => [{ id: chatId }]);
    messagesMock.chats.generateTitle.mockImplementation(() => title);
    messagesMock.chats.getOtherProfiles.mockImplementation(() => [chat.profiles[0]]);
    await renderComponent({ inputs: { user, chat, profile } });
    expect(screen.getByRole('link', { name: title })).toBeVisible();
    expect(screen.queryByText(profile.user.username)).toBeNull();
    expect(screen.queryByText(/untitled/i)).toBeNull();
  });

  it('should display a message-seen indicator', async () => {
    messagesMock.hasBeenSeen.mockImplementation(() => true);
    await renderComponent({ inputs: { user, chat, chatId } });
    expect(screen.getByLabelText(/seen/i)).toBeVisible();
    expect(screen.queryByLabelText(/sent/i)).toBeNull();
    expect(screen.queryByLabelText(/received/i)).toBeNull();
  });

  it('should display a message-received indicator', async () => {
    messagesMock.hasBeenReceived.mockImplementation(() => true);
    await renderComponent({ inputs: { user, chat, chatId } });
    expect(screen.getByLabelText(/received/i)).toBeVisible();
    expect(screen.queryByLabelText(/seen/i)).toBeNull();
    expect(screen.queryByLabelText(/sent/i)).toBeNull();
  });

  it('should navigate back when clicking the back button', async () => {
    const { click } = userEvent.setup();
    await renderComponent({ inputs: { user, chat, chatId } });
    const backBtn = screen.getByRole('link', { name: /back/i });
    await click(backBtn);
    expect(navigationSpy).toHaveBeenCalledOnce();
  });

  it('should auto-scroll once start', async () => {
    await renderComponent({ inputs: { user, chat, chatId } });
    expect(HTMLElement.prototype.scrollBy).toHaveBeenCalledTimes(1);
  });

  it('should scroll, and load recent messages when clicking the update button', async () => {
    const { click } = userEvent.setup();
    await renderComponent({ inputs: { user, chat, chatId } });
    const updateBtn = screen.getByRole('button', { name: /update/i });
    await click(updateBtn);
    expect(HTMLElement.prototype.scrollBy).toHaveBeenCalledTimes(2); // +1 auto-scroll on start
    expect(messagesMock.loadRecent).toHaveBeenCalledExactlyOnceWith(chatId, user.username);
  });

  it('should display updating indicator on loading recent messages', async () => {
    messagesMock.loadingRecent.mockImplementation(() => true);
    await renderComponent({ inputs: { user, chat, chatId } });
    expect(screen.getByLabelText(/updating/i)).toBeVisible();
  });

  it('should display updating error, if any', async () => {
    const errorMessage = 'Test update error';
    messagesMock.loadRecentError.mockImplementation(() => errorMessage);
    await renderComponent({ inputs: { user, chat, chatId } });
    expect(screen.queryByLabelText(/updating/i)).toBeNull();
    expect(screen.getByText(errorMessage)).toBeVisible();
  });

  it('should not have a form if it is a dead chat', async () => {
    messagesMock.chats.isDeadChat.mockImplementation(() => true);
    await renderComponent({ inputs: { user, chat, chatId } });
    expect(screen.queryByRole('form', { name: /message/i })).toBeNull();
    expect(screen.getByText(/cannot receive new messages/i)).toBeVisible();
  });

  it('should not have a form if a profile and chat IDs', async () => {
    await renderComponent({ inputs: { user, chat } });
    expect(screen.queryByRole('form', { name: /message/i })).toBeNull();
    expect(screen.queryByText(/cannot receive new messages/i)).toBeNull();
  });

  it('should display more-messages loader indicator', async () => {
    messagesMock.hasMore.mockImplementation(() => true);
    messagesMock.loading.mockImplementation(() => true);
    await renderComponent({ inputs: { user, chat, chatId } });
    expect(screen.getByLabelText(/loading more messages/i)).toBeVisible();
    expect(screen.queryByLabelText(/loading messages/i)).toBeNull();
    for (const msg of messages) {
      if (msg.body) expect(screen.getByText(msg.body)).toBeVisible();
      if (msg.image) expect(screen.getByRole('img', { name: msg.image.alt }));
    }
    expect(screen.getAllByRole('img')).toHaveLength(messages.filter((msg) => !!msg.image).length);
  });

  it('should display load-more button, that invokes the load-more method', async () => {
    const { click } = userEvent.setup();
    messagesMock.hasMore.mockImplementation(() => true);
    await renderComponent({ inputs: { user, chat, chatId } });
    const loadMoreBtn = screen.getByRole('button', { name: /load more/i });
    await click(loadMoreBtn);
    expect(loadMoreBtn).toBeVisible();
    expect(messagesMock.load).toHaveBeenCalledExactlyOnceWith();
  });

  it('should display more-messages load error, and a button to retry loading more messages', async () => {
    const { click } = userEvent.setup();
    const errMsg = 'Test messages load error';
    messagesMock.hasMore.mockImplementation(() => true);
    messagesMock.loadError.mockImplementation(() => errMsg);
    await renderComponent({ inputs: { user, chat, chatId } });
    const retryBtn = screen.getByRole('button', { name: /retry/i });
    await click(retryBtn);
    expect(retryBtn).toBeVisible();
    expect(screen.getByText(errMsg)).toBeVisible();
    expect(screen.queryByLabelText(/loading more/i)).toBeNull();
    expect(messagesMock.load).toHaveBeenCalledExactlyOnceWith();
    for (const msg of messages) {
      if (msg.body) expect(screen.getByText(msg.body)).toBeVisible();
      if (msg.image) expect(screen.getByRole('img', { name: msg.image.alt }));
    }
    expect(screen.getAllByRole('img')).toHaveLength(messages.filter((msg) => !!msg.image).length);
  });
});
