import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { asyncScheduler, observeOn, of, throwError } from 'rxjs';
import { Chat, Message, NewMessageData } from '../chats.types';
import { provideHttpClient } from '@angular/common/http';
import { environment } from '../../../environments';
import { TestBed } from '@angular/core/testing';
import { Messages } from './messages';
import { Chats } from '../chats';

const { apiUrl } = environment;

const chatId = crypto.randomUUID();

const chatsMock = {
  baseUrl: `${apiUrl}/chats`,
  getChatMessages: vi.fn(),
  createMessage: vi.fn(),
  getChat: vi.fn(),
  activate: vi.fn(),
  deactivate: vi.fn(),
  updateActivatedChatMessages: vi.fn(),
  activatedChat: vi.fn<() => { id: string; messages: Message[] }>(() => ({
    id: chatId,
    messages: [],
  })),
};

const message = {
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  profileName: 'test_sender_1',
  id: crypto.randomUUID(),
  body: 'Hi!',
} as Message;
const message2 = {
  createdAt: new Date(Date.now() + 1).toISOString(),
  updatedAt: new Date(Date.now() + 1).toISOString(),
  profileName: 'test_sender_2',
  id: crypto.randomUUID(),
  body: 'Bye!',
} as Message;
const message3 = {
  createdAt: new Date(Date.now() + 2).toISOString(),
  updatedAt: new Date(Date.now() + 2).toISOString(),
  profileName: 'test_sender_3',
  id: crypto.randomUUID(),
  body: 'Yes!',
} as Message;

const newMessageData = { body: 'Hello!' } as NewMessageData;

const profileName = message.profileName;

const setup = () => {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: Chats, useValue: chatsMock },
      Messages,
    ],
  });
  const httpTesting = TestBed.inject(HttpTestingController);
  const service = TestBed.inject(Messages);
  return { service, httpTesting };
};

const getServiceState = (service: Messages) => {
  return {
    list: service.list(),
    loading: service.loading(),
    loadError: service.loadError(),
    loadingRecent: service.loadingRecent(),
    loadRecentError: service.loadRecentError(),
    hasMore: service.hasMore(),
  };
};

const setMessageList = (messages: Message[]) => {
  const activatedChat = chatsMock.activatedChat();
  chatsMock.activatedChat.mockImplementation(() => ({ ...activatedChat, messages }));
};

describe('Messages', () => {
  afterEach(vi.resetAllMocks);

  it('should have the initial state', () => {
    const { service } = setup();
    const serviceInitialState = getServiceState(service);
    expect(serviceInitialState.list).toStrictEqual([]);
    expect(serviceInitialState.loadError).toBe('');
    expect(serviceInitialState.loading).toBe(false);
    expect(serviceInitialState.hasMore).toBe(false);
  });

  it('should init', () => {
    const { service } = setup();
    const chat = { id: chatId, messages: [message, message] } as Chat;
    service.init(chat, profileName);
    const serviceFinalState = getServiceState(service);
    expect(serviceFinalState.loadError).toBe('');
    expect(serviceFinalState.hasMore).toBe(true);
    expect(serviceFinalState.loading).toBe(false);
    expect(serviceFinalState.loadRecentError).toBe('');
    expect(serviceFinalState.loadingRecent).toBe(false);
    expect(serviceFinalState.list).toStrictEqual(chatsMock.activatedChat().messages);
    expect(chatsMock.activate).toHaveBeenCalledExactlyOnceWith(chat, profileName);
    expect(chatsMock.deactivate).toHaveBeenCalledOnce();
  });

  it('should load the messages', () => {
    vi.useFakeTimers();
    chatsMock.getChatMessages.mockImplementation(() =>
      of([message, message]).pipe(observeOn(asyncScheduler, 0))
    );
    const { service } = setup();
    setMessageList([message]);
    service.load(chatId);
    const serviceLoadingState = getServiceState(service);
    vi.runOnlyPendingTimers();
    const serviceFinalState = getServiceState(service);
    expect(serviceLoadingState.loadingRecent).toBe(false);
    expect(serviceLoadingState.loadRecentError).toBe('');
    expect(serviceLoadingState.loading).toBe(true);
    expect(serviceLoadingState.loadError).toBe('');
    expect(serviceLoadingState.hasMore).toBe(false);
    expect(serviceLoadingState.list).toStrictEqual([message]);
    expect(serviceFinalState.list).toStrictEqual([message]);
    expect(serviceFinalState.loadingRecent).toBe(false);
    expect(serviceFinalState.loadRecentError).toBe('');
    expect(serviceFinalState.loading).toBe(false);
    expect(serviceFinalState.hasMore).toBe(true);
    expect(serviceFinalState.loadError).toBe('');
    expect(chatsMock.getChatMessages).toHaveBeenCalledOnce();
    expect(chatsMock.updateActivatedChatMessages).toHaveBeenCalledOnce();
    vi.useRealTimers();
  });

  it('should reset load error on load', async () => {
    vi.useFakeTimers();
    chatsMock.getChatMessages.mockImplementation(() =>
      of([message, message]).pipe(observeOn(asyncScheduler, 0))
    );
    const { service } = setup();
    service.loadError.set('Blah');
    service.load(chatId);
    const serviceLoadingState = getServiceState(service);
    vi.runOnlyPendingTimers();
    const serviceFinalState = getServiceState(service);
    expect(serviceLoadingState.loadError).toBe('');
    expect(serviceFinalState.loadError).toBe('');
    vi.useRealTimers();
  });

  it('should fail to load the messages', () => {
    vi.useFakeTimers();
    chatsMock.getChatMessages.mockImplementation(() =>
      throwError(() => new Error('Get messages error')).pipe(observeOn(asyncScheduler, 0))
    );
    const { service } = setup();
    service.load(chatId);
    const serviceLoadingState = getServiceState(service);
    vi.runOnlyPendingTimers();
    const serviceErrorState = getServiceState(service);
    expect(serviceLoadingState.loadingRecent).toBe(false);
    expect(serviceLoadingState.loadRecentError).toBe('');
    expect(serviceLoadingState.loading).toBe(true);
    expect(serviceLoadingState.loadError).toBe('');
    expect(serviceLoadingState.hasMore).toBe(false);
    expect(serviceLoadingState.list).toStrictEqual([]);
    expect(serviceErrorState.list).toStrictEqual([]);
    expect(serviceErrorState.loading).toBe(false);
    expect(serviceErrorState.hasMore).toBe(false);
    expect(serviceErrorState.loadRecentError).toBe('');
    expect(serviceErrorState.loadingRecent).toBe(false);
    expect(serviceErrorState.loadError).toMatch(/failed/i);
    vi.useRealTimers();
  });

  it('should load more messages', () => {
    vi.useFakeTimers();
    chatsMock.getChatMessages.mockImplementation(() =>
      of([message, message3]).pipe(observeOn(asyncScheduler, 0))
    );
    const { service } = setup();
    setMessageList([message2, message3]);
    service.load(chatId);
    const serviceLoadingState = getServiceState(service);
    vi.runOnlyPendingTimers();
    const serviceFinalState = getServiceState(service);
    expect(serviceLoadingState.loadingRecent).toBe(false);
    expect(serviceLoadingState.loadRecentError).toBe('');
    expect(serviceLoadingState.loading).toBe(true);
    expect(serviceLoadingState.loadError).toBe('');
    expect(serviceLoadingState.hasMore).toBe(false);
    expect(serviceLoadingState.list).toStrictEqual([message2, message3]);
    expect(serviceFinalState.list).toStrictEqual([message2, message3]);
    expect(serviceFinalState.loadingRecent).toBe(false);
    expect(serviceFinalState.loadRecentError).toBe('');
    expect(serviceFinalState.loading).toBe(false);
    expect(serviceFinalState.hasMore).toBe(true);
    expect(serviceFinalState.loadError).toBe('');
    vi.useRealTimers();
  });

  it('should reset load-more error on load', async () => {
    vi.useFakeTimers();
    chatsMock.getChatMessages.mockImplementation(() =>
      of([message]).pipe(observeOn(asyncScheduler, 0))
    );
    const { service } = setup();
    setMessageList([message2]);
    service.loadError.set('Blah');
    service.load(chatId);
    const serviceLoadingState = getServiceState(service);
    vi.runOnlyPendingTimers();
    const serviceFinalState = getServiceState(service);
    expect(serviceLoadingState.loadError).toBe('');
    expect(serviceFinalState.loadError).toBe('');
    vi.useRealTimers();
  });

  it('should fail to load more messages', () => {
    vi.useFakeTimers();
    chatsMock.getChatMessages.mockImplementation(() =>
      throwError(() => new Error('Get messages error')).pipe(observeOn(asyncScheduler, 0))
    );
    const { service } = setup();
    setMessageList([message]);
    service.hasMore.set(true);
    service.load(chatId);
    const serviceLoadingState = getServiceState(service);
    vi.runOnlyPendingTimers();
    const serviceErrorState = getServiceState(service);
    expect(serviceLoadingState.loadingRecent).toBe(false);
    expect(serviceLoadingState.loadRecentError).toBe('');
    expect(serviceLoadingState.loading).toBe(true);
    expect(serviceLoadingState.loadError).toBe('');
    expect(serviceLoadingState.hasMore).toBe(true);
    expect(serviceLoadingState.list).toStrictEqual([message]);
    expect(serviceErrorState.list).toStrictEqual([message]);
    expect(serviceErrorState.loadError).toMatch(/failed/i);
    expect(serviceErrorState.loadingRecent).toBe(false);
    expect(serviceErrorState.loadRecentError).toBe('');
    expect(serviceErrorState.loading).toBe(false);
    expect(serviceErrorState.hasMore).toBe(true);
    vi.useRealTimers();
  });

  it('should load recent messages', async () => {
    vi.useFakeTimers();
    chatsMock.getChatMessages.mockImplementation(() =>
      of([message, message2]).pipe(observeOn(asyncScheduler, 0))
    );
    const { service } = setup();
    setMessageList([message3, message2]);
    service.loadRecent(chatId, message3.profileName);
    const serviceLoadingState = getServiceState(service);
    vi.runOnlyPendingTimers();
    const serviceFinalState = getServiceState(service);
    expect(serviceLoadingState.loadingRecent).toBe(true);
    expect(serviceLoadingState.loadRecentError).toBe('');
    expect(serviceLoadingState.loading).toBe(false);
    expect(serviceLoadingState.loadError).toBe('');
    expect(serviceLoadingState.hasMore).toBe(false);
    expect(serviceLoadingState.list).toStrictEqual([message3, message2]);
    expect(serviceFinalState.list).toStrictEqual([message3, message2]);
    expect(serviceFinalState.loadingRecent).toBe(false);
    expect(serviceFinalState.loadRecentError).toBe('');
    expect(serviceFinalState.loading).toBe(false);
    expect(serviceFinalState.hasMore).toBe(false);
    expect(serviceFinalState.loadError).toBe('');
    vi.useRealTimers();
  });

  it('should try to load recent messages again if the recent response updated the message list', async () => {
    chatsMock.updateActivatedChatMessages.mockImplementationOnce(() => true);
    chatsMock.getChatMessages.mockImplementation(() => of([message]));
    const { service } = setup();
    setMessageList([message3, message2]);
    service.loadRecent(chatId, message3.profileName);
    await vi.waitFor(() => expect(chatsMock.getChatMessages).toHaveBeenCalledTimes(2));
  });

  it('should not try to load recent messages again if not got any messages', async () => {
    vi.useFakeTimers();
    chatsMock.getChatMessages.mockImplementation(() => of([]).pipe(observeOn(asyncScheduler, 0)));
    const { service } = setup();
    setMessageList([message3, message2]);
    service.loadRecent(chatId, message3.profileName);
    vi.runAllTimers();
    expect(chatsMock.getChatMessages).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it('should fail to load recent messages', async () => {
    vi.useFakeTimers();
    chatsMock.getChatMessages.mockImplementation(() =>
      throwError(() => new Error('Get messages error')).pipe(observeOn(asyncScheduler, 0))
    );
    const { service } = setup();
    setMessageList([message3, message2]);
    service.loadRecent(chatId, message3.profileName);
    const serviceLoadingState = getServiceState(service);
    vi.runOnlyPendingTimers();
    const serviceErrorState = getServiceState(service);
    expect(serviceLoadingState.loadingRecent).toBe(true);
    expect(serviceLoadingState.loadRecentError).toBe('');
    expect(serviceLoadingState.loading).toBe(false);
    expect(serviceLoadingState.loadError).toBe('');
    expect(serviceLoadingState.hasMore).toBe(false);
    expect(serviceLoadingState.list).toStrictEqual([message3, message2]);
    expect(serviceErrorState.list).toStrictEqual([message3, message2]);
    expect(serviceErrorState.loadingRecent).toBe(false);
    expect(serviceErrorState.loadRecentError).toMatch(/failed/i);
    expect(serviceErrorState.loading).toBe(false);
    expect(serviceErrorState.hasMore).toBe(false);
    expect(serviceErrorState.loadError).toBe('');
    expect(chatsMock.getChatMessages.mock.calls[0][1].get('cursor')).toBe(message2.id);
    vi.useRealTimers();
  });

  it('should reset load-recent error on load', async () => {
    vi.useFakeTimers();
    chatsMock.getChatMessages.mockImplementation(() =>
      of([message]).pipe(observeOn(asyncScheduler, 0))
    );
    const { service } = setup();
    service.loadRecentError.set('Blah');
    service.loadRecent(chatId, message3.profileName);
    const serviceLoadingState = getServiceState(service);
    vi.runOnlyPendingTimers();
    const serviceFinalState = getServiceState(service);
    expect(serviceLoadingState.loadRecentError).toBe('');
    expect(serviceFinalState.loadRecentError).toBe('');
    vi.useRealTimers();
  });

  it('should use the recent, non-current-user message id for loading recent messages', async () => {
    chatsMock.getChatMessages.mockImplementation(() => of([message, message2]));
    const { service } = setup();
    setMessageList([message3, message2]);
    service.loadRecent(chatId, message3.profileName);
    expect(chatsMock.getChatMessages.mock.calls[0][1].get('cursor')).toBe(message2.id);
  });

  it('should use the recent message id for loading recent messages, if all messages from current user', async () => {
    chatsMock.getChatMessages.mockImplementation(() => of([message, message3]));
    const { service } = setup();
    setMessageList([message2, message2]);
    service.loadRecent(chatId, message2.profileName);
    expect(chatsMock.getChatMessages.mock.calls[0][1].get('cursor')).toBe(message2.id);
  });

  it('should update the current message list with the newly created message', () => {
    chatsMock.createMessage.mockImplementation(() => of(message2));
    const { service } = setup();
    let createdMessage: unknown;
    service.create(chatId, newMessageData).subscribe((msg) => (createdMessage = msg));
    expect(createdMessage).toStrictEqual(message2);
  });

  it('should not update the current message list if an error have been occurred', () => {
    chatsMock.createMessage.mockImplementation(() => throwError(() => new Error('create msg err')));
    const { service } = setup();
    setMessageList([message]);
    service.create(chatId, newMessageData).subscribe({ error: () => undefined });
    expect(service.list()).toStrictEqual([message]);
  });
});
