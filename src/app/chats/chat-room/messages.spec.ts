import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { asyncScheduler, Observable, observeOn, of, throwError } from 'rxjs';
import { provideHttpClient } from '@angular/common/http';
import { Message, NewMessageData } from '../chats.types';
import { environment } from '../../../environments';
import { TestBed } from '@angular/core/testing';
import { Messages } from './messages';
import { Chats } from '../chats';

const { apiUrl } = environment;

const chatsMock = {
  baseUrl: `${apiUrl}/chats`,
  navigateToChatByMemberProfileId: vi.fn(() => of(Promise.resolve(true))),
  createMessage: vi.fn<() => Observable<unknown>>(() => of({ id: crypto.randomUUID() })),
  getChatMessages: vi.fn<() => Observable<unknown[]>>(() => of([{ id: crypto.randomUUID() }])),
  getChat: vi.fn<() => Observable<unknown>>(() => of({ id: crypto.randomUUID(), messages: [] })),
};

const chatId = crypto.randomUUID();
const message = { id: crypto.randomUUID(), body: 'Hi!' } as Message;
const newMessageData = { body: 'Hello!' } as NewMessageData;

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
    canLoad: service.canLoad(),
    loadError: service.loadError(),
    loadingMore: service.loadingMore(),
    canLoadMore: service.canLoadMore(),
    loadMoreError: service.loadMoreError(),
  };
};

describe('Messages', () => {
  it('should have the expected initial state', () => {
    const { service } = setup();
    const serviceInitialState = getServiceState(service);
    expect(serviceInitialState.canLoadMore).toBe(false);
    expect(serviceInitialState.loadingMore).toBe(false);
    expect(serviceInitialState.list).toStrictEqual([]);
    expect(serviceInitialState.loadMoreError).toBe('');
    expect(serviceInitialState.canLoad).toBe(true);
    expect(serviceInitialState.loadError).toBe('');
    expect(serviceInitialState.loading).toBe(false);
  });

  it('should load the messages', () => {
    vi.useFakeTimers();
    chatsMock.getChatMessages.mockImplementation(() =>
      of([message, message]).pipe(observeOn(asyncScheduler, 0))
    );
    const { service } = setup();
    service.load(chatId);
    const serviceLoadingState = getServiceState(service);
    vi.runAllTimers();
    const serviceFinalState = getServiceState(service);
    expect(serviceLoadingState.loading).toBe(true);
    expect(serviceLoadingState.loadError).toBe('');
    expect(serviceLoadingState.canLoad).toBe(false);
    expect(serviceLoadingState.loadMoreError).toBe('');
    expect(serviceLoadingState.loadingMore).toBe(false);
    expect(serviceLoadingState.canLoadMore).toBe(false);
    expect(serviceLoadingState.list).toStrictEqual([]);
    expect(serviceFinalState.list).toStrictEqual([message, message]);
    expect(serviceFinalState.loadingMore).toBe(false);
    expect(serviceFinalState.loadMoreError).toBe('');
    expect(serviceFinalState.canLoadMore).toBe(true);
    expect(serviceFinalState.loading).toBe(false);
    expect(serviceFinalState.canLoad).toBe(true);
    expect(serviceFinalState.loadError).toBe('');
    chatsMock.getChatMessages.mockReset();
  });

  it('should fail to load the messages', () => {
    vi.useFakeTimers();
    chatsMock.getChatMessages.mockImplementation(() =>
      throwError(() => new Error('Get messages error')).pipe(observeOn(asyncScheduler, 0))
    );
    const { service } = setup();
    service.load(chatId);
    const serviceLoadingState = getServiceState(service);
    vi.runAllTimers();
    const serviceErrorState = getServiceState(service);
    expect(serviceLoadingState.loading).toBe(true);
    expect(serviceLoadingState.loadError).toBe('');
    expect(serviceLoadingState.canLoad).toBe(false);
    expect(serviceLoadingState.loadMoreError).toBe('');
    expect(serviceLoadingState.loadingMore).toBe(false);
    expect(serviceLoadingState.canLoadMore).toBe(false);
    expect(serviceLoadingState.list).toStrictEqual([]);
    expect(serviceErrorState.list).toStrictEqual([]);
    expect(serviceErrorState.loadingMore).toBe(false);
    expect(serviceErrorState.loadMoreError).toBe('');
    expect(serviceErrorState.loading).toBe(false);
    expect(serviceErrorState.canLoad).toBe(true);
    expect(serviceErrorState.canLoadMore).toBe(false);
    expect(serviceErrorState.loadError).toMatch(/failed/i);
    chatsMock.getChatMessages.mockReset();
  });

  it('should load more messages', () => {
    vi.useFakeTimers();
    chatsMock.getChatMessages.mockImplementation(() =>
      of([message]).pipe(observeOn(asyncScheduler, 0))
    );
    const { service } = setup();
    service.list.set([message]);
    service.loadMore(chatId);
    const serviceLoadingState = getServiceState(service);
    vi.runAllTimers();
    const serviceFinalState = getServiceState(service);
    expect(serviceLoadingState.loading).toBe(false);
    expect(serviceLoadingState.loadError).toBe('');
    expect(serviceLoadingState.canLoad).toBe(false);
    expect(serviceLoadingState.loadMoreError).toBe('');
    expect(serviceLoadingState.loadingMore).toBe(true);
    expect(serviceLoadingState.canLoadMore).toBe(false);
    expect(serviceLoadingState.list).toStrictEqual([message]);
    expect(serviceFinalState.list).toStrictEqual([message, message]);
    expect(serviceFinalState.loadingMore).toBe(false);
    expect(serviceFinalState.loadMoreError).toBe('');
    expect(serviceFinalState.canLoadMore).toBe(true);
    expect(serviceFinalState.loading).toBe(false);
    expect(serviceFinalState.canLoad).toBe(true);
    expect(serviceFinalState.loadError).toBe('');
    chatsMock.getChatMessages.mockReset();
  });

  it('should fail to load more messages', () => {
    vi.useFakeTimers();
    chatsMock.getChatMessages.mockImplementation(() =>
      throwError(() => new Error('Get messages error')).pipe(observeOn(asyncScheduler, 0))
    );
    const { service } = setup();
    service.list.set([message]);
    service.hasMore.set(true);
    service.loadMore(chatId);
    const serviceLoadingState = getServiceState(service);
    vi.runAllTimers();
    const serviceErrorState = getServiceState(service);
    expect(serviceLoadingState.loading).toBe(false);
    expect(serviceLoadingState.loadError).toBe('');
    expect(serviceLoadingState.canLoad).toBe(false);
    expect(serviceLoadingState.loadMoreError).toBe('');
    expect(serviceLoadingState.loadingMore).toBe(true);
    expect(serviceLoadingState.canLoadMore).toBe(false);
    expect(serviceLoadingState.list).toStrictEqual([message]);
    expect(serviceErrorState.list).toStrictEqual([message]);
    expect(serviceErrorState.loadingMore).toBe(false);
    expect(serviceErrorState.loadMoreError).toMatch(/failed/i);
    expect(serviceErrorState.canLoadMore).toBe(true);
    expect(serviceErrorState.loading).toBe(false);
    expect(serviceErrorState.canLoad).toBe(true);
    expect(serviceErrorState.loadError).toBe('');
    chatsMock.getChatMessages.mockReset();
  });

  it('should fail to load messages by member id due to navigation error, do nothing on success', () => {
    vi.useFakeTimers();
    chatsMock.navigateToChatByMemberProfileId.mockImplementationOnce(() =>
      throwError(() => new Error('Test nav error')).pipe(observeOn(asyncScheduler, 200))
    );
    const { service } = setup();
    const userProfileId = crypto.randomUUID();
    const memberProfileId = crypto.randomUUID();
    service.loadByMemberProfileId(memberProfileId, userProfileId);
    const serviceLoadingState = getServiceState(service);
    vi.runAllTimers();
    const serviceErrorState = getServiceState(service);
    service.loadByMemberProfileId(memberProfileId, userProfileId);
    const serviceFinalState = getServiceState(service);
    expect(serviceLoadingState.loadingMore).toBe(false);
    expect(serviceLoadingState.canLoadMore).toBe(false);
    expect(serviceLoadingState.list).toStrictEqual([]);
    expect(serviceLoadingState.loadMoreError).toBe('');
    expect(serviceLoadingState.canLoad).toBe(false);
    expect(serviceLoadingState.loading).toBe(true);
    expect(serviceLoadingState.loadError).toBe('');
    expect(serviceErrorState.canLoad).toBe(true);
    expect(serviceErrorState.loading).toBe(false);
    expect(serviceErrorState.list).toStrictEqual([]);
    expect(serviceErrorState.loadMoreError).toBe('');
    expect(serviceErrorState.canLoadMore).toBe(false);
    expect(serviceErrorState.loadingMore).toBe(false);
    expect(serviceErrorState.loadError).toMatch(/failed/i);
    expect(serviceFinalState.loadingMore).toBe(false);
    expect(serviceFinalState.canLoadMore).toBe(false);
    expect(serviceFinalState.loadMoreError).toBe('');
    expect(serviceFinalState.list).toStrictEqual([]);
    expect(serviceFinalState.loading).toBe(false);
    expect(serviceFinalState.canLoad).toBe(true);
    expect(serviceFinalState.loadError).toBe('');
    vi.useRealTimers();
  });

  it('should update the current message list with the newly created message', () => {
    const { service } = setup();
    service.list.set([message]);
    let createdMessage: unknown;
    service.create(chatId, newMessageData).subscribe((msg) => (createdMessage = msg));
    expect(service.list()).toStrictEqual([createdMessage, message]);
  });

  it('should not update the current message list if an error have been occurred', () => {
    chatsMock.createMessage.mockImplementation(() => throwError(() => new Error('create msg err')));
    const { service } = setup();
    service.list.set([message]);
    service.create(chatId, newMessageData).subscribe({ error: () => undefined });
    expect(service.list()).toStrictEqual([message]);
    chatsMock.createMessage.mockReset();
  });
});
