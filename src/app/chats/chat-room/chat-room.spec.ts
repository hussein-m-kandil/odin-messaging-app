import { render, RenderComponentOptions } from '@testing-library/angular';
import { provideRouter, Router } from '@angular/router';
import { userEvent } from '@testing-library/user-event';
import { Chat, Message, User } from '../chats.types';
import { screen } from '@testing-library/dom';
import { Profiles } from '../../profiles';
import { ChatRoom } from './chat-room';
import { Observable, of } from 'rxjs';
import { Messages } from './messages';

const user = { id: crypto.randomUUID(), username: 'test_username' } as User;
const profile = { id: crypto.randomUUID() } as User['profile'];
user.profile = profile;
profile.user = user;

const chatId = crypto.randomUUID();
const now = new Date().toISOString();
const messages: Message[] = [
  {
    chatId,
    body: 'Hi!',
    createdAt: now,
    updatedAt: now,
    id: crypto.randomUUID(),
    profileName: 'test_user_1',
  },
  {
    chatId,
    body: 'Bye!',
    createdAt: now,
    updatedAt: now,
    id: crypto.randomUUID(),
    profileName: 'test_user_2',
  },
];

const chat = { id: chatId, messages } as Chat;

const navigationSpy = vi.spyOn(Router.prototype, 'navigate');

const messagesMock = {
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
    createMessage: vi.fn<() => Observable<unknown>>(() => of({ id: crypto.randomUUID() })),
    getChatMessages: vi.fn<() => Observable<unknown[]>>(() => of([{ id: crypto.randomUUID() }])),
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
    componentProviders: [
      { provide: Profiles, useValue: profilesMock },
      { provide: Messages, useValue: messagesMock },
      ...(componentProviders || []),
    ],
    providers: [provideRouter([]), ...(providers || [])],
    ...options,
  });
};

describe('ChatRoom', () => {
  afterEach(vi.resetAllMocks);

  it('should display a chat with messages, navbar, and message form', async () => {
    await renderComponent({ inputs: { user, chat, chatId } });
    expect(screen.getByRole('navigation')).toBeVisible();
    expect(screen.getByRole('button', { name: /back/i })).toBeVisible();
    expect(screen.getByRole('form', { name: /message/i })).toBeVisible();
    expect(screen.getByRole('button', { name: /refresh/i })).toBeVisible();
    expect(screen.queryByRole('button', { name: /try/i })).toBeNull();
    expect(screen.queryByLabelText(/loading/i)).toBeNull();
    expect(screen.queryByText(/failed/i)).toBeNull();
    for (const msg of messages) {
      expect(screen.getByText(msg.body)).toBeVisible();
    }
  });

  it('should display "untitled" as the chat title', async () => {
    await renderComponent({ inputs: { user, chat, chatId } });
    expect(screen.getByText(/untitled/i)).toBeVisible();
  });

  it('should display the given title as the chat title', async () => {
    const title = 'Test Chat Title';
    messagesMock.chats.list.mockImplementation(() => [{ id: chatId }]);
    messagesMock.chats.generateTitle.mockImplementation(() => title);
    await renderComponent({ inputs: { user, chat, chatId } });
    expect(screen.getByText(title)).toBeVisible();
  });

  it('should display the given profile name as the chat title', async () => {
    profilesMock.list.mockImplementation(() => [profile]);
    await renderComponent({ inputs: { user, chat, profileId: profile.id } });
    expect(screen.getByText(profile.user.username)).toBeVisible();
  });

  it('should navigate back when clicking the back button', async () => {
    const { click } = userEvent.setup();
    await renderComponent({ inputs: { user, chat, chatId } });
    const backBtn = screen.getByRole('button', { name: /back/i });
    await click(backBtn);
    expect(navigationSpy).toHaveBeenCalledOnce();
  });

  it('should reset, then load the messages when clicking the refresh button', async () => {
    const { click } = userEvent.setup();
    await renderComponent({ inputs: { user, chat, chatId } });
    const refreshBtn = screen.getByRole('button', { name: /refresh/i });
    await click(refreshBtn);
    expect(messagesMock.reset).toHaveBeenCalledOnce();
    expect(messagesMock.load).toHaveBeenCalledExactlyOnceWith(chatId);
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
      expect(screen.getByText(msg.body)).toBeVisible();
    }
  });

  it('should load more messages automatically while the load-more button is visible', async () => {
    messagesMock.hasMore.mockImplementation(() => true);
    await renderComponent({ inputs: { user, chat, chatId } });
    const loadMoreBtn = screen.getByRole('button', { name: /load more/i });
    expect(loadMoreBtn).toBeVisible();
    expect(messagesMock.load).toHaveBeenCalledExactlyOnceWith(chatId);
  });

  it('should display load-more button, that invokes the load-more method', async () => {
    const { click } = userEvent.setup();
    messagesMock.hasMore.mockImplementation(() => true);
    await renderComponent({ inputs: { user, chat, chatId } });
    messagesMock.load.mockClear();
    const loadMoreBtn = screen.getByRole('button', { name: /load more/i });
    await click(loadMoreBtn);
    expect(loadMoreBtn).toBeVisible();
    expect(messagesMock.load).toHaveBeenCalledExactlyOnceWith(chatId);
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
    expect(messagesMock.load).toHaveBeenCalledExactlyOnceWith(chatId);
    for (const msg of messages) {
      expect(screen.getByText(msg.body)).toBeVisible();
    }
  });
});
