import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { asyncScheduler, observeOn, of, throwError } from 'rxjs';
import { Message, NewMessageData } from '../chats.types';
import { environment } from '../../../environments';
import { TestBed } from '@angular/core/testing';
import { Messages } from './messages';
import { Chats } from '../chats';

const { apiUrl } = environment;

const chatsMock = {
  baseUrl: `${apiUrl}/chats`,
  navigateToChatByMemberProfileId: vi.fn(() => of(Promise.resolve(true))),
};

const createUrl = (chatId: string, messageId?: Message['id']) => {
  return `${chatsMock.baseUrl}/${chatId}/messages${messageId ? `?cursor=${messageId}` : ''}`;
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
    const { service, httpTesting } = setup();
    service.list.set([message]);
    service.load(chatId);
    const reqInfo = { method: 'GET', url: createUrl(chatId) };
    const req = httpTesting.expectOne(reqInfo, 'Request to load the messages');
    const serviceLoadingState = getServiceState(service);
    req.flush([message, message]);
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
    httpTesting.verify();
  });

  it('should fail to load the messages on the 1st time due to a server error, then succeed on the 2nd', () => {
    const { service, httpTesting } = setup();
    const checkReq = () => {
      const reqInfo = { method: 'GET', url: createUrl(chatId) };
      return httpTesting.expectOne(reqInfo, 'Request to load the messages');
    };
    service.list.set([message]);
    service.load(chatId);
    const firstReq = checkReq();
    const serviceLoadingState = getServiceState(service);
    firstReq.flush('Failed', { status: 500, statusText: 'Internal server error' });
    const serviceErrorState = getServiceState(service);
    service.load(chatId);
    const secondReq = checkReq();
    const serviceSecondLoadingState = getServiceState(service);
    secondReq.flush([message, message]);
    const serviceFinalState = getServiceState(service);
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
    expect(serviceSecondLoadingState).toStrictEqual(serviceLoadingState);
    expect(serviceFinalState.list).toStrictEqual([message, message]);
    expect(serviceFinalState.loadingMore).toBe(false);
    expect(serviceFinalState.loadMoreError).toBe('');
    expect(serviceFinalState.canLoadMore).toBe(true);
    expect(serviceFinalState.loading).toBe(false);
    expect(serviceFinalState.loadError).toBe('');
    expect(serviceFinalState.canLoad).toBe(true);
    httpTesting.verify();
  });

  it('should fail to load the messages on the 1st time due to a network error, then succeed on the 2nd', () => {
    const { service, httpTesting } = setup();
    const checkReq = () => {
      const reqInfo = { method: 'GET', url: createUrl(chatId) };
      return httpTesting.expectOne(reqInfo, 'Request to load the messages');
    };
    service.list.set([message]);
    service.load(chatId);
    const firstReq = checkReq();
    const serviceLoadingState = getServiceState(service);
    firstReq.error(new ProgressEvent('Network failed'));
    const serviceErrorState = getServiceState(service);
    service.load(chatId);
    const secondReq = checkReq();
    const serviceSecondLoadingState = getServiceState(service);
    secondReq.flush([message, message]);
    const serviceFinalState = getServiceState(service);
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
    expect(serviceErrorState.loadError).toMatch(/check .*(internet) connection/i);
    expect(serviceSecondLoadingState).toStrictEqual(serviceLoadingState);
    expect(serviceFinalState.list).toStrictEqual([message, message]);
    expect(serviceFinalState.loadingMore).toBe(false);
    expect(serviceFinalState.loadMoreError).toBe('');
    expect(serviceFinalState.canLoadMore).toBe(true);
    expect(serviceFinalState.loading).toBe(false);
    expect(serviceFinalState.loadError).toBe('');
    expect(serviceFinalState.canLoad).toBe(true);
    httpTesting.verify();
  });

  it('should load more messages', () => {
    const { service, httpTesting } = setup();
    service.load(chatId);
    httpTesting.expectOne(createUrl(chatId)).flush([message]);
    service.loadMore(chatId);
    const reqInfo = { method: 'GET', url: createUrl(chatId, message.id) };
    const req = httpTesting.expectOne(reqInfo, 'Request to load more messages');
    const serviceLoadingState = getServiceState(service);
    req.flush([message]);
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
    httpTesting.verify();
  });

  it('should fail to load more messages on the 1st time due to a server error, then succeed on the 2nd', () => {
    const { service, httpTesting } = setup();
    const checkReq = () => {
      const reqInfo = { method: 'GET', url: createUrl(chatId, message.id) };
      return httpTesting.expectOne(reqInfo, 'Request to load more messages');
    };
    service.load(chatId);
    httpTesting.expectOne(createUrl(chatId)).flush([message]);
    service.loadMore(chatId);
    const firstRequest = checkReq();
    const serviceLoadingState = getServiceState(service);
    firstRequest.flush('Failed', { status: 500, statusText: 'Internal server error' });
    const serviceErrorState = getServiceState(service);
    service.loadMore(chatId);
    const secondRequest = checkReq();
    const serviceSecondLoadingState = getServiceState(service);
    secondRequest.flush([message]);
    const serviceFinalState = getServiceState(service);
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
    expect(serviceSecondLoadingState).toStrictEqual(serviceLoadingState);
    expect(serviceFinalState.loadError).toBe('');
    expect(serviceFinalState.canLoad).toBe(true);
    expect(serviceFinalState.loading).toBe(false);
    expect(serviceFinalState.loadMoreError).toBe('');
    expect(serviceFinalState.canLoadMore).toBe(true);
    expect(serviceFinalState.loadingMore).toBe(false);
    expect(serviceFinalState.list).toStrictEqual([message, message]);
    httpTesting.verify();
  });

  it('should fail to load more messages on the 1st time due to a network error, then succeed on the 2nd', () => {
    const { service, httpTesting } = setup();
    const checkReq = () => {
      const reqInfo = { method: 'GET', url: createUrl(chatId, message.id) };
      return httpTesting.expectOne(reqInfo, 'Request to load more messages');
    };
    service.load(chatId);
    httpTesting.expectOne(createUrl(chatId)).flush([message]);
    service.loadMore(chatId);
    const firstRequest = checkReq();
    const serviceLoadingState = getServiceState(service);
    firstRequest.error(new ProgressEvent('Network error'));
    const serviceErrorState = getServiceState(service);
    service.loadMore(chatId);
    const secondRequest = checkReq();
    const serviceSecondLoadingState = getServiceState(service);
    secondRequest.flush([message]);
    const serviceFinalState = getServiceState(service);
    expect(serviceLoadingState.loading).toBe(false);
    expect(serviceLoadingState.loadError).toBe('');
    expect(serviceLoadingState.canLoad).toBe(false);
    expect(serviceLoadingState.loadMoreError).toBe('');
    expect(serviceLoadingState.loadingMore).toBe(true);
    expect(serviceLoadingState.canLoadMore).toBe(false);
    expect(serviceLoadingState.list).toStrictEqual([message]);
    expect(serviceErrorState.list).toStrictEqual([message]);
    expect(serviceErrorState.loadingMore).toBe(false);
    expect(serviceErrorState.loadMoreError).toMatch(/check .*(internet)? connection/i);
    expect(serviceErrorState.canLoadMore).toBe(true);
    expect(serviceErrorState.loading).toBe(false);
    expect(serviceErrorState.canLoad).toBe(true);
    expect(serviceErrorState.loadError).toBe('');
    expect(serviceSecondLoadingState).toStrictEqual(serviceLoadingState);
    expect(serviceFinalState.loadError).toBe('');
    expect(serviceFinalState.canLoad).toBe(true);
    expect(serviceFinalState.loading).toBe(false);
    expect(serviceFinalState.loadMoreError).toBe('');
    expect(serviceFinalState.canLoadMore).toBe(true);
    expect(serviceFinalState.loadingMore).toBe(false);
    expect(serviceFinalState.list).toStrictEqual([message, message]);
    httpTesting.verify();
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

  it('should create a message', () => {
    const { service, httpTesting } = setup();
    const newMsg$ = service.create(chatId, newMessageData);
    let resData, resErr;
    newMsg$.subscribe({ next: (d) => (resData = d), error: (e) => (resErr = e) });
    const reqInfo = { method: 'POST', url: createUrl(chatId) };
    const req = httpTesting.expectOne(reqInfo, 'Request to create a message');
    req.flush(message);
    expect(resData).toStrictEqual(message);
    expect(resErr).toBeUndefined();
    httpTesting.verify();
  });

  it('should fail to create a message due to a server error', () => {
    const { service, httpTesting } = setup();
    const newMsg$ = service.create(chatId, newMessageData);
    let resData, resErr;
    newMsg$.subscribe({ next: (d) => (resData = d), error: (e) => (resErr = e) });
    const reqInfo = { method: 'POST', url: createUrl(chatId) };
    const req = httpTesting.expectOne(reqInfo, 'Request to create a message');
    const error = 'Failed';
    req.flush(error, { status: 500, statusText: 'Internal server error' });
    expect(resErr).toBeInstanceOf(HttpErrorResponse);
    expect(resErr).toHaveProperty('error', error);
    expect(resErr).toHaveProperty('status', 500);
    expect(resData).toBeUndefined();
    httpTesting.verify();
  });

  it('should fail to create a message due to a network error', () => {
    const { service, httpTesting } = setup();
    const newMsg$ = service.create(chatId, newMessageData);
    let resData, resErr;
    newMsg$.subscribe({ next: (d) => (resData = d), error: (e) => (resErr = e) });
    const reqInfo = { method: 'POST', url: createUrl(chatId) };
    const req = httpTesting.expectOne(reqInfo, 'Request to create a message');
    const error = new ProgressEvent('Network error');
    req.error(error);
    expect(resErr).toBeInstanceOf(HttpErrorResponse);
    expect(resErr).toHaveProperty('error', error);
    expect(resErr).toHaveProperty('status', 0);
    expect(resData).toBeUndefined();
    httpTesting.verify();
  });
});
