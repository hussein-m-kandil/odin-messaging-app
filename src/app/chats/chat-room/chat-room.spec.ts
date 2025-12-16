import { render, RenderComponentOptions } from '@testing-library/angular';
import { provideRouter, Router } from '@angular/router';
import { ChatRoom } from './chat-room';
import { Messages } from './messages';
import { Message, User } from '../chats.types';
import { screen } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import { Profiles } from '../../profiles';

const user = { id: crypto.randomUUID(), profile: { id: crypto.randomUUID() } } as User;
const profileId = crypto.randomUUID();
const chatId = crypto.randomUUID();

const now = new Date().toISOString();
const messages: Message[] = [
  {
    chatId,
    seenBy: [],
    body: 'Hi!',
    receivedBy: [],
    createdAt: now,
    updatedAt: now,
    id: crypto.randomUUID(),
    profileName: 'test_user_1',
  },
  {
    chatId,
    seenBy: [],
    body: 'Bye!',
    receivedBy: [],
    createdAt: now,
    updatedAt: now,
    id: crypto.randomUUID(),
    profileName: 'test_user_2',
  },
];

const navigationSpy = vi.spyOn(Router.prototype, 'navigate');

const messagesMock = {
  loadByMemberProfileId: vi.fn<() => void>(),
  hasAnyLoadError: vi.fn(() => false),
  canLoadMore: vi.fn(() => false),
  loadingMore: vi.fn(() => false),
  moreLoaded: vi.fn(() => false),
  loadMoreError: vi.fn(() => ''),
  loadMore: vi.fn<() => void>(),
  loading: vi.fn(() => false),
  canLoad: vi.fn(() => false),
  hasMore: vi.fn(() => false),
  loadError: vi.fn(() => ''),
  load: vi.fn<() => void>(),
  reset: vi.fn<() => void>(),
  list: vi.fn(() => messages),
  chats: {
    isDeadChat: vi.fn<() => void>(),
    generateTitle: vi.fn<() => string>(),
    list: vi.fn<() => unknown[]>(() => []),
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
    await renderComponent({ inputs: { user, chatId } });
    expect(screen.getByRole('navigation')).toBeVisible();
    expect(screen.getByRole('button', { name: /back/i })).toBeVisible();
    expect(screen.getByRole('form', { name: /message/i })).toBeVisible();
    expect(screen.getByRole('button', { name: /refresh/i })).toBeVisible();
    expect(screen.queryByRole('button', { name: /try/i })).toBeNull();
    expect(screen.queryByText(/loading/i)).toBeNull();
    expect(screen.queryByText(/failed/i)).toBeNull();
    for (const msg of messages) {
      expect(screen.getByText(msg.profileName)).toBeVisible();
      expect(screen.getByText(msg.body)).toBeVisible();
    }
  });

  it('should display an empty chat, and try to load an old chat by profile id', async () => {
    messagesMock.canLoad.mockImplementation(() => true);
    await renderComponent({ inputs: { user, profileId } });
    expect(screen.getByRole('navigation')).toBeVisible();
    expect(screen.getByRole('button', { name: /back/i })).toBeVisible();
    expect(screen.getByRole('form', { name: /message/i })).toBeVisible();
    expect(screen.getByRole('button', { name: /refresh/i })).toBeVisible();
    expect(screen.queryByRole('button', { name: /try/i })).toBeNull();
    expect(screen.queryByText(/loading/i)).toBeNull();
    expect(screen.queryByText(/failed/i)).toBeNull();
    for (const msg of messages) {
      expect(screen.queryByText(msg.profileName)).toBeNull();
      expect(screen.queryByText(msg.body)).toBeNull();
    }
    expect(messagesMock.load).toHaveBeenCalledTimes(0);
    expect(messagesMock.loadByMemberProfileId).toHaveBeenCalledExactlyOnceWith(
      profileId,
      user.profile.id
    );
  });

  it('should display "untitled" as the chat title', async () => {
    await renderComponent({ inputs: { user, chatId } });
    expect(screen.getByText(/untitled/i)).toBeVisible();
  });

  it('should display the given title as the chat title', async () => {
    const title = 'Test Chat Title';
    messagesMock.chats.list.mockImplementation(() => [{ id: chatId }]);
    messagesMock.chats.generateTitle.mockImplementation(() => title);
    await renderComponent({ inputs: { user, chatId } });
    expect(screen.getByText(title)).toBeVisible();
  });

  it('should display the given profile name as the chat title', async () => {
    const profile = { id: profileId, user: { ...user, username: 'test_username' } };
    profilesMock.list.mockImplementation(() => [profile]);
    await renderComponent({ inputs: { user, profileId } });
    expect(screen.getByText(profile.user.username)).toBeVisible();
  });

  it('should navigate back when clicking the back button', async () => {
    const { click } = userEvent.setup();
    await renderComponent({ inputs: { user, chatId } });
    const backBtn = screen.getByRole('button', { name: /back/i });
    await click(backBtn);
    expect(navigationSpy).toHaveBeenCalledOnce();
  });

  it('should reset, then load the messages when clicking the refresh button', async () => {
    const { click } = userEvent.setup();
    await renderComponent({ inputs: { user, chatId } });
    const refreshBtn = screen.getByRole('button', { name: /refresh/i });
    await click(refreshBtn);
    expect(messagesMock.reset).toHaveBeenCalledOnce();
    expect(messagesMock.load).toHaveBeenCalledExactlyOnceWith(chatId);
  });

  it('should not have a form if it is a dead chat', async () => {
    messagesMock.chats.isDeadChat.mockImplementation(() => true);
    await renderComponent({ inputs: { user, chatId } });
    expect(screen.queryByRole('form', { name: /message/i })).toBeNull();
    expect(screen.getByText(/cannot receive new messages/i)).toBeVisible();
  });

  it('should display messages loader indicator', async () => {
    messagesMock.loading.mockImplementation(() => true);
    await renderComponent({ inputs: { user, chatId } });
    expect(screen.getByText(/loading messages/i)).toBeVisible();
    expect(screen.queryByText(/loading more messages/i)).toBeNull();
    for (const msg of messages) {
      expect(screen.queryByText(msg.profileName)).toBeNull();
      expect(screen.queryByText(msg.body)).toBeNull();
    }
  });

  it('should display more-messages loader indicator', async () => {
    messagesMock.canLoadMore.mockImplementation(() => true);
    messagesMock.loadingMore.mockImplementation(() => true);
    await renderComponent({ inputs: { user, chatId } });
    expect(screen.getByText(/loading more messages/i)).toBeVisible();
    expect(screen.queryByText(/loading messages/i)).toBeNull();
    for (const msg of messages) {
      expect(screen.getByText(msg.profileName)).toBeVisible();
      expect(screen.getByText(msg.body)).toBeVisible();
    }
  });

  it('should load more messages automatically while the load-more button is visible', async () => {
    messagesMock.canLoadMore.mockImplementation(() => true);
    await renderComponent({ inputs: { user, chatId } });
    const loadMoreBtn = screen.getByRole('button', { name: /load more/i });
    expect(loadMoreBtn).toBeVisible();
    expect(messagesMock.loadMore).toHaveBeenCalledExactlyOnceWith(chatId);
  });

  it('should display load-more button, that invokes the load-more method', async () => {
    const { click } = userEvent.setup();
    messagesMock.canLoadMore.mockImplementation(() => true);
    await renderComponent({ inputs: { user, chatId } });
    messagesMock.loadMore.mockClear();
    const loadMoreBtn = screen.getByRole('button', { name: /load more/i });
    await click(loadMoreBtn);
    expect(loadMoreBtn).toBeVisible();
    expect(messagesMock.loadMore).toHaveBeenCalledExactlyOnceWith(chatId);
  });

  it('should display messages load error, and a button to retry loading the messages', async () => {
    const { click } = userEvent.setup();
    const errMsg = 'Test messages load error';
    messagesMock.loadError.mockImplementation(() => errMsg);
    await renderComponent({ inputs: { user, chatId } });
    const retryBtn = screen.getByRole('button', { name: /retry/i });
    await click(retryBtn);
    expect(retryBtn).toBeVisible();
    expect(screen.getByText(errMsg)).toBeVisible();
    expect(screen.queryByText(/loading/i)).toBeNull();
    expect(messagesMock.load).toHaveBeenCalledExactlyOnceWith(chatId);
    for (const msg of messages) {
      expect(screen.queryByText(msg.profileName)).toBeNull();
      expect(screen.queryByText(msg.body)).toBeNull();
    }
  });

  it('should display more-messages load error, and a button to retry loading more messages', async () => {
    const { click } = userEvent.setup();
    const errMsg = 'Test messages load error';
    messagesMock.canLoadMore.mockImplementation(() => true);
    messagesMock.loadMoreError.mockImplementation(() => errMsg);
    await renderComponent({ inputs: { user, chatId } });
    const retryBtn = screen.getByRole('button', { name: /retry/i });
    await click(retryBtn);
    expect(retryBtn).toBeVisible();
    expect(screen.getByText(errMsg)).toBeVisible();
    expect(screen.queryByText(/loading/i)).toBeNull();
    expect(messagesMock.loadMore).toHaveBeenCalledExactlyOnceWith(chatId);
    for (const msg of messages) {
      expect(screen.getByText(msg.profileName)).toBeVisible();
      expect(screen.getByText(msg.body)).toBeVisible();
    }
  });
});
