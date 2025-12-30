import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { asyncScheduler, Observable, observeOn, of, throwError } from 'rxjs';
import { provideHttpClient } from '@angular/common/http';
import { Chat, Message, NewMessageData } from '../chats.types';
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
    loadError: service.loadError(),
    hasMore: service.hasMore(),
  };
};

describe('Messages', () => {
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
    service.init({ id: chatId, messages: [message, message] } as Chat);
    const serviceFinalState = getServiceState(service);
    expect(serviceFinalState.loadError).toBe('');
    expect(serviceFinalState.hasMore).toBe(true);
    expect(serviceFinalState.loading).toBe(false);
    expect(serviceFinalState.list).toStrictEqual([message, message]);
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
    expect(serviceLoadingState.hasMore).toBe(false);
    expect(serviceLoadingState.list).toStrictEqual([]);
    expect(serviceFinalState.list).toStrictEqual([message, message]);
    expect(serviceFinalState.loading).toBe(false);
    expect(serviceFinalState.hasMore).toBe(true);
    expect(serviceFinalState.loadError).toBe('');
    chatsMock.getChatMessages.mockReset();
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
    vi.runAllTimers();
    const serviceErrorState = getServiceState(service);
    expect(serviceLoadingState.loading).toBe(true);
    expect(serviceLoadingState.loadError).toBe('');
    expect(serviceLoadingState.hasMore).toBe(false);
    expect(serviceLoadingState.list).toStrictEqual([]);
    expect(serviceErrorState.list).toStrictEqual([]);
    expect(serviceErrorState.loading).toBe(false);
    expect(serviceErrorState.hasMore).toBe(false);
    expect(serviceErrorState.loadError).toMatch(/failed/i);
    chatsMock.getChatMessages.mockReset();
    vi.useRealTimers();
  });

  it('should load more messages', () => {
    vi.useFakeTimers();
    chatsMock.getChatMessages.mockImplementation(() =>
      of([message]).pipe(observeOn(asyncScheduler, 0))
    );
    const { service } = setup();
    service.list.set([message]);
    service.load(chatId);
    const serviceLoadingState = getServiceState(service);
    vi.runAllTimers();
    const serviceFinalState = getServiceState(service);
    expect(serviceLoadingState.loading).toBe(true);
    expect(serviceLoadingState.loadError).toBe('');
    expect(serviceLoadingState.hasMore).toBe(false);
    expect(serviceLoadingState.list).toStrictEqual([message]);
    expect(serviceFinalState.list).toStrictEqual([message, message]);
    expect(serviceFinalState.loading).toBe(false);
    expect(serviceFinalState.hasMore).toBe(true);
    expect(serviceFinalState.loadError).toBe('');
    chatsMock.getChatMessages.mockReset();
    vi.useRealTimers();
  });

  it('should fail to load more messages', () => {
    vi.useFakeTimers();
    chatsMock.getChatMessages.mockImplementation(() =>
      throwError(() => new Error('Get messages error')).pipe(observeOn(asyncScheduler, 0))
    );
    const { service } = setup();
    service.list.set([message]);
    service.hasMore.set(true);
    service.load(chatId);
    const serviceLoadingState = getServiceState(service);
    vi.runAllTimers();
    const serviceErrorState = getServiceState(service);
    expect(serviceLoadingState.loading).toBe(true);
    expect(serviceLoadingState.loadError).toBe('');
    expect(serviceLoadingState.hasMore).toBe(true);
    expect(serviceLoadingState.list).toStrictEqual([message]);
    expect(serviceErrorState.list).toStrictEqual([message]);
    expect(serviceErrorState.loadError).toMatch(/failed/i);
    expect(serviceErrorState.loading).toBe(false);
    expect(serviceErrorState.hasMore).toBe(true);
    chatsMock.getChatMessages.mockReset();
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
