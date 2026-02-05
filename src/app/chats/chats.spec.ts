import {
  HttpParams,
  HttpResponse,
  HttpEventType,
  provideHttpClient,
  HttpErrorResponse,
} from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Chat, Message, NewMessageData } from './chats.types';
import { provideRouter, Router } from '@angular/router';
import { environment } from '../../environments';
import { TestBed } from '@angular/core/testing';
import { Profile, User } from '../app.types';
import { Component } from '@angular/core';
import { Chats } from './chats';
import { Auth } from '../auth';

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

const { apiUrl } = environment;
const chatsUrl = `${apiUrl}/chats`;

const message = { id: crypto.randomUUID(), body: 'Hi!', chatId: chat.id } as Message;

const authMock = { user: vi.fn(() => user) };

const navigationSpy = vi.spyOn(Router.prototype, 'navigate');

@Component({ selector: 'app-route-component-mock', template: '<div>Route Component Mock</div>' })
class RouteComponentMock {}

const setup = () => {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([{ path: '**', component: RouteComponentMock }]),
      { provide: Auth, useValue: authMock },
    ],
  });
  const httpTesting = TestBed.inject(HttpTestingController);
  const service = TestBed.inject(Chats);
  return { service, httpTesting };
};

describe('Chats', () => {
  afterEach(vi.resetAllMocks);

  it('should have an activated chat in the initial state', () => {
    const { service } = setup();
    expect(service.activatedChat()).toBe(null);
  });

  it('should reset the activated chat', () => {
    const { service } = setup();
    service.activatedChat.set(chat);
    service.reset();
    expect(service.activatedChat()).toBe(null);
  });

  it('should activate chat even if it is not in the chat list', () => {
    authMock.user.mockImplementationOnce(() => user);
    const { service } = setup();
    service.activate(chat);
    expect(service.activatedChat()).toStrictEqual(chat);
  });

  it('should activate chat, and update the chat profile last-seen date', () => {
    authMock.user.mockImplementationOnce(() => user);
    const { service, httpTesting } = setup();
    const chats = [chat];
    service.list.set(chats);
    service.activate(chat);
    service.activate(chat);
    service.activate(chat); // Assert that only one seen-request will be sent (idempotency)
    const req = httpTesting.expectOne(
      { method: 'PATCH', url: `${chatsUrl}/${chat.id}/seen` },
      'Request to update the chat profile last-seen date.',
    );
    const lastSeenAt = new Date(Date.now() + 7).toISOString();
    const expectedChats = [
      {
        ...chat,
        profiles: [{ ...chat.profiles[0], lastSeenAt }, ...chat.profiles.slice(1)],
      },
    ];
    req.flush(lastSeenAt);
    expect(service.activatedChat()).toStrictEqual(expectedChats[0]);
    expect(service.list()).toStrictEqual(expectedChats);
    httpTesting.expectOne(
      { method: 'GET', url: `${chatsUrl}?limit=${chats.length}` },
      'Request to update chats',
    );
    httpTesting.verify();
  });

  it('should activate chat, and silently fail to update the chat profile last-seen date due to a network error', () => {
    authMock.user.mockImplementationOnce(() => user);
    const { service, httpTesting } = setup();
    service.list.set([chat]);
    service.activate(chat);
    const req = httpTesting.expectOne(
      { method: 'PATCH', url: `${chatsUrl}/${chat.id}/seen` },
      'Request to update the chat profile last-seen date.',
    );
    req.error(new ProgressEvent('Network error'));
    expect(service.activatedChat()).toStrictEqual(chat);
    expect(service.list()).toStrictEqual([chat]);
    httpTesting.expectOne(
      { method: 'GET', url: `${chatsUrl}?limit=${service.list().length}` },
      'Request to update chats with the current limit',
    );
    httpTesting.verify();
  });

  it('should activate chat, and silently fail to update the chat profile last-seen date due to a backend error', () => {
    authMock.user.mockImplementationOnce(() => user);
    const { service, httpTesting } = setup();
    service.list.set([chat]);
    service.activate(chat);
    const req = httpTesting.expectOne(
      { method: 'PATCH', url: `${chatsUrl}/${chat.id}/seen` },
      'Request to update the chat profile last-seen date.',
    );
    req.flush('Failed', { status: 500, statusText: 'Internal server error' });
    expect(service.activatedChat()).toStrictEqual(chat);
    expect(service.list()).toStrictEqual([chat]);
    httpTesting.expectOne(
      { method: 'GET', url: `${chatsUrl}?limit=${service.list().length}` },
      'Request to update chats with the current limit',
    );
    httpTesting.verify();
  });

  it('should reactivate the active chat on refresh', () => {
    const { service } = setup();
    service.activate(chat);
    const activateSpy = vi.spyOn(service, 'activate');
    const updateChatsSpy = vi.spyOn(service, 'updateChats');
    service.refresh();
    expect(activateSpy).toHaveBeenCalledExactlyOnceWith(chat);
    expect(updateChatsSpy).toHaveBeenCalledTimes(0);
  });

  it('should only update the chats on refresh, if there is no an active chat', () => {
    const { service } = setup();
    const activateSpy = vi.spyOn(service, 'activate');
    const updateChatsSpy = vi.spyOn(service, 'updateChats');
    service.refresh();
    expect(updateChatsSpy).toHaveBeenCalledExactlyOnceWith();
    expect(activateSpy).toHaveBeenCalledTimes(0);
  });

  it('should update and sort the activated chat messages, without duplications, and return `true`', () => {
    authMock.user.mockImplementationOnce(() => user);
    const messages: Message[] = [];
    for (let i = 0; i < 3; i++) {
      messages[i] = {
        ...message,
        createdAt: new Date(Date.now() - i).toISOString(),
        id: crypto.randomUUID(),
        body: 'blah',
      } as Message;
    }
    const { service } = setup();
    service.activate({ ...chat, messages: [messages[2], messages[0]] });
    const updated = service.updateMessages([messages[0], messages[1]]);
    const activatedChat = service.activatedChat()!;
    const updatedChat = { ...chat, updatedAt: activatedChat.updatedAt };
    expect(updated).toBe(true);
    expect(activatedChat.messages).toStrictEqual(messages);
    expect(activatedChat.messages).toStrictEqual(messages);
    expect({ ...activatedChat, messages: [] }).toStrictEqual(updatedChat);
    expect(new Date(service.activatedChat()!.updatedAt).getTime()).toBeGreaterThan(
      new Date(chat.updatedAt).getTime(),
    );
  });

  it('should sort the activated chat messages, without duplications, and return `false`', () => {
    authMock.user.mockImplementationOnce(() => user);
    const messages: Message[] = [];
    for (let i = 0; i < 3; i++) {
      messages[i] = {
        ...message,
        createdAt: new Date(Date.now() - i).toISOString(),
        id: crypto.randomUUID(),
        body: 'blah',
      } as Message;
    }
    const { service } = setup();
    service.activate({ ...chat, messages: [messages[2], messages[0], messages[1]] });
    const updated = service.updateMessages([messages[0], messages[1]]);
    const activatedChat = service.activatedChat()!;
    const updatedChat = { ...chat, updatedAt: activatedChat.updatedAt };
    expect(updated).toBe(false);
    expect(activatedChat.messages).toStrictEqual(messages);
    expect({ ...activatedChat, messages: [] }).toStrictEqual(updatedChat);
    expect(new Date(service.activatedChat()!.updatedAt).getTime()).toBeGreaterThan(
      new Date(chat.updatedAt).getTime(),
    );
  });

  it('should not update the activated chat messages, and return `false`', () => {
    const { service } = setup();
    const updated = service.updateMessages([
      {
        createdAt: new Date().toISOString(),
        id: crypto.randomUUID(),
        body: 'blah',
      } as Message,
    ]);
    expect(updated).toBe(false);
    expect(service.activatedChat()).toStrictEqual(null);
  });

  it('should update the activated chat messages, and its corresponding chat in the chat list', () => {
    authMock.user.mockImplementationOnce(() => user);
    const messages: Message[] = [];
    for (let i = 0; i < 3; i++) {
      messages[i] = {
        ...message,
        createdAt: new Date(Date.now() - i).toISOString(),
        id: crypto.randomUUID(),
        body: 'blah',
      } as Message;
    }
    const chatList = [chat, { ...chat, id: crypto.randomUUID() }];
    const { service } = setup();
    service.list.set(chatList);
    service.activate(chatList[0]);
    const updated = service.updateMessages(messages);
    const activatedChat = service.activatedChat()!;
    const updatedChat = { ...chatList[0], messages, updatedAt: activatedChat.updatedAt };
    expect(updated).toBe(true);
    expect(activatedChat).toStrictEqual(updatedChat);
    expect(service.list()[0]).toStrictEqual(updatedChat);
    expect(service.list()[1]).toStrictEqual(chatList[1]);
    expect(new Date(activatedChat.updatedAt).getTime()).toBeGreaterThan(
      new Date(chatList[0].updatedAt).getTime(),
    );
  });

  it('should not update the activated chat messages if it has been changed, instead, update its corresponding chat in the chat list', () => {
    authMock.user.mockImplementationOnce(() => user);
    const chatList = [chat, { ...chat, id: crypto.randomUUID() }];
    const messages: Message[] = [];
    for (let i = 0; i < 3; i++) {
      messages[i] = {
        ...message,
        chatId: chatList[1].id,
        createdAt: new Date(Date.now() - i).toISOString(),
        id: crypto.randomUUID(),
        body: 'blah',
      } as Message;
    }
    const { service } = setup();
    service.list.set(chatList);
    service.activate(chatList[0]);
    const updated = service.updateMessages(messages);
    expect(updated).toBe(true);
    expect(service.list()[0]).toStrictEqual({
      ...chatList[1],
      messages,
      updatedAt: service.list()[0].updatedAt,
    }); // The order have been changed
    expect(service.activatedChat()).toStrictEqual(chatList[0]);
    expect(service.list()[1]).toStrictEqual(chatList[0]);
  });

  it('should keep the activated chat updates in the chat list, after deactivating', () => {
    authMock.user.mockImplementationOnce(() => user);
    const chatList = [chat, { ...chat, id: crypto.randomUUID() }];
    const messages: Message[] = [];
    for (let i = 0; i < 3; i++) {
      messages[i] = {
        ...message,
        createdAt: new Date(Date.now() - i).toISOString(),
        id: crypto.randomUUID(),
        body: 'blah',
      } as Message;
    }
    const { service } = setup();
    service.list.set(chatList);
    service.activate(chatList[0]);
    const updated = service.updateMessages(messages);
    service.deactivate();
    expect(updated).toBe(true);
    expect(service.activatedChat()).toBeNull();
    expect(service.list()[1]).toStrictEqual(chatList[1]);
    expect(service.list()[0]).toStrictEqual({
      ...chatList[0],
      messages,
      updatedAt: service.list()[0].updatedAt,
    });
  });

  it('should load the chats', () => {
    const { service, httpTesting } = setup();
    service.load();
    const reqInfo = { method: 'GET', url: chatsUrl };
    const req = httpTesting.expectOne(reqInfo, 'Request to get the chats');
    const chats = [chat];
    req.flush(chats);
    expect(service.list()).toStrictEqual(chats);
    httpTesting.verify();
  });

  it('should fail to load the chats due to a server error', () => {
    const { service, httpTesting } = setup();
    service.list.set([]);
    service.load();
    const reqInfo = { method: 'GET', url: chatsUrl };
    const req = httpTesting.expectOne(reqInfo, 'Request to get the chats');
    req.flush('Failed', { status: 500, statusText: 'Internal server error' });
    expect(service.loadError()).toMatch(/failed/i);
    expect(service.list()).toStrictEqual([]);
    httpTesting.verify();
  });

  it('should fail to load the chats due to a network error', () => {
    const { service, httpTesting } = setup();
    service.list.set([]);
    service.load();
    const reqInfo = { method: 'GET', url: chatsUrl };
    const req = httpTesting.expectOne(reqInfo, 'Request to get the chats');
    req.error(new ProgressEvent('Network error'));
    expect(service.loadError()).toMatch(/check .*(internet)? connection/i);
    expect(service.list()).toStrictEqual([]);
    httpTesting.verify();
  });

  it('should load more the chats', () => {
    const { service, httpTesting } = setup();
    service.list.set([chat]);
    service.load();
    const reqInfo = { method: 'GET', url: `${chatsUrl}?cursor=${chat.id}` };
    const req = httpTesting.expectOne(reqInfo, 'Request to get more chats');
    req.flush([chat]);
    expect(service.list()).toStrictEqual([chat, chat]);
    httpTesting.verify();
  });

  it('should fail to load more chats due to a server error', () => {
    const { service, httpTesting } = setup();
    service.list.set([chat]);
    service.load();
    const reqInfo = { method: 'GET', url: `${chatsUrl}?cursor=${chat.id}` };
    const req = httpTesting.expectOne(reqInfo, 'Request to get more chats');
    req.flush('Failed', { status: 500, statusText: 'Internal server error' });
    expect(service.loadError()).toMatch(/failed/i);
    expect(service.list()).toStrictEqual([chat]);
    httpTesting.verify();
  });

  it('should fail to load more chats on the 1st time due to a network error, then succeed on the 2nd', () => {
    const { service, httpTesting } = setup();
    service.list.set([chat]);
    service.load();
    const reqInfo = { method: 'GET', url: `${chatsUrl}?cursor=${chat.id}` };
    const firstReq = httpTesting.expectOne(reqInfo, 'Request to get more chats');
    firstReq.error(new ProgressEvent('Network error'));
    expect(service.loadError()).toMatch(/check .*(internet)? connection/i);
    expect(service.list()).toStrictEqual([chat]);
    httpTesting.verify();
  });

  it('should do nothing if the current chat list is empty', () => {
    const { service, httpTesting } = setup();
    const initialList = service.list();
    service.updateChats();
    httpTesting.expectNone('Request to load chats');
    expect(service.list()).toStrictEqual(initialList);
    expect(service.list()).toHaveLength(0);
    httpTesting.verify();
  });

  it('should update the current chats while keeping their order, and update the activated chat while keeping its messages', () => {
    const { service, httpTesting } = setup();
    const chats = [
      {
        ...chat,
        id: crypto.randomUUID(),
        messages: [
          ...chat.messages,
          {
            ...message,
            id: crypto.randomUUID(),
            createdAt: new Date(Date.now() + 13).toISOString(),
          },
        ],
      },
      chat,
    ];
    service.activatedChat.set(chats[0]);
    service.list.set(chats);
    service.updateChats();
    service.updateChats(); // Assert that it does not trigger a new update while updating
    const req = httpTesting.expectOne(
      { method: 'GET', url: `${chatsUrl}?limit=${chats.length}` },
      'Request to update chats',
    );
    const expectedMessages = [
      {
        ...message,
        id: crypto.randomUUID(),
        profileName: profile2.user.username,
        createdAt: new Date(Date.now() + 17).toISOString(),
      },
      {
        ...message,
        id: crypto.randomUUID(),
        profileName: profile.user.username,
        createdAt: new Date(Date.now() + 15).toISOString(),
      },
      ...chats[0].messages,
    ];
    const expectedChats = [
      {
        ...chats[0],
        profiles: chats[0].profiles.map((cp) => ({
          ...cp,
          lastSeenAt: new Date(),
          lastReceivedAt: new Date(),
        })),
        messages: expectedMessages,
      },
      ...chats.slice(1),
    ];
    req.flush([
      ...[
        { ...expectedChats[0], messages: [...[...expectedMessages].reverse()] },
        ...expectedChats.slice(1),
      ].reverse(),
    ]);
    expect(service.activatedChat()).toStrictEqual(expectedChats[0]);
    expect(service.list()).toStrictEqual(expectedChats);
    httpTesting.verify();
  });

  it('should update/sort current chats, update activated chat, and send another limited request if response has extra chats', () => {
    const { service, httpTesting } = setup();
    const chat1 = {
      ...chat,
      id: crypto.randomUUID(),
      updatedAt: new Date(Date.now() - 7).toISOString(),
      messages: [
        ...chat.messages,
        {
          ...message,
          id: crypto.randomUUID(),
          createdAt: new Date(Date.now() + 13).toISOString(),
        },
      ],
    };
    const chat2 = {
      ...chat,
      id: crypto.randomUUID(),
      updatedAt: new Date(Date.now() - 5).toISOString(),
    };
    const extraChat1 = {
      ...chat,
      id: crypto.randomUUID(),
      updatedAt: new Date(Date.now() - 3).toISOString(),
    };
    const extraChat2 = {
      ...chat,
      id: crypto.randomUUID(),
      updatedAt: new Date(Date.now() - 1).toISOString(),
    };
    const expectedChats = [
      extraChat2,
      extraChat1,
      chat2,
      {
        ...chat1,
        profiles: chat1.profiles.map((cp) => ({
          ...cp,
          lastSeenAt: new Date(),
          lastReceivedAt: new Date(),
        })),
        messages: [
          {
            ...message,
            id: crypto.randomUUID(),
            profileName: profile2.user.username,
            createdAt: new Date(Date.now() + 17).toISOString(),
          },
          {
            ...message,
            id: crypto.randomUUID(),
            profileName: profile.user.username,
            createdAt: new Date(Date.now() + 15).toISOString(),
          },
          ...chat1.messages,
        ],
      },
    ];
    service.activatedChat.set(chat1);
    service.list.set([chat2, chat1]);
    service.updateChats();
    service.updateChats(); // Assert that it does not trigger a new update while updating
    httpTesting
      .expectOne(
        { method: 'GET', url: `${chatsUrl}?limit=${2}` },
        'Request to update chats with the current limit',
      )
      .flush(
        [
          expectedChats[1],
          expectedChats[0],
          { ...expectedChats[3], messages: [...[...expectedChats[3].messages].reverse()] },
          expectedChats[2],
        ].reverse(),
      );
    httpTesting
      .expectOne(
        { method: 'GET', url: `${chatsUrl}?limit=${expectedChats.length}` },
        'another request to update chats with the new limit',
      )
      .flush(
        [
          { ...expectedChats[3], messages: [...[...expectedChats[3].messages].reverse()] },
          expectedChats[0],
          expectedChats[2],
          expectedChats[1],
        ].reverse(),
      );
    expect(service.activatedChat()).toStrictEqual(expectedChats[3]);
    expect(service.list()).toStrictEqual(expectedChats);
    httpTesting.verify();
  });

  it('should fail, silently, to update chats due to a network error', () => {
    const { service, httpTesting } = setup();
    service.list.set([chat]);
    service.updateChats();
    const req = httpTesting.expectOne(
      { method: 'GET', url: `${chatsUrl}?limit=1` },
      'Request to update chats',
    );
    req.error(new ProgressEvent('Network error'));
    expect(service.list()).toStrictEqual([chat]);
    httpTesting.verify();
  });

  it('should fail, silently, to update chats due to a server error', () => {
    const { service, httpTesting } = setup();
    service.list.set([chat]);
    service.updateChats();
    const req = httpTesting.expectOne(
      { method: 'GET', url: `${chatsUrl}?limit=1` },
      'Request to update chats',
    );
    req.flush('Failed', { status: 500, statusText: 'Internal server error' });
    expect(service.list()).toStrictEqual([chat]);
    httpTesting.verify();
  });

  it('should navigate to old chat if got from the current list by member and user profile ids', async () => {
    const { service, httpTesting } = setup();
    service.list.set([chat]);
    const memberProfileId = profile2.id;
    const req$ = service.navigateToChatByMember(memberProfileId);
    let res: unknown, errRes: unknown;
    req$.subscribe({ next: (d) => (res = d), error: (e) => (errRes = e) });
    const url = `${chatsUrl}/members/${memberProfileId}`;
    httpTesting.expectNone(url, 'Request to find a chat by member id');
    expect(errRes).toBeUndefined();
    expect(res).toBeInstanceOf(Promise);
    await expect(res).resolves.toBe(true);
    expect(navigationSpy).toHaveBeenCalledExactlyOnceWith(['/chats', chat.id]);
    httpTesting.verify();
  });

  it('should navigate to old chat if got from the backend by member and user profile ids', async () => {
    const { service, httpTesting } = setup();
    const memberProfileId = profile2.id;
    const req$ = service.navigateToChatByMember(memberProfileId);
    let res: unknown, errRes: unknown;
    req$.subscribe({ next: (d) => (res = d), error: (e) => (errRes = e) });
    const reqInfo = { method: 'GET', url: `${chatsUrl}/members/${memberProfileId}` };
    const req = httpTesting.expectOne(reqInfo, 'Request to find a chat by member id');
    req.flush([chat]);
    expect(errRes).toBeUndefined();
    expect(res).toBeInstanceOf(Promise);
    await expect(res).resolves.toBe(true);
    expect(navigationSpy).toHaveBeenCalledExactlyOnceWith(['/chats', chat.id]);
    httpTesting.verify();
  });

  it('should not navigate to old chat if not found by member and user profile ids', async () => {
    const { service, httpTesting } = setup();
    const memberProfileId = profile.id;
    const req$ = service.navigateToChatByMember(memberProfileId);
    let res: unknown, errRes: unknown;
    req$.subscribe({ next: (d) => (res = d), error: (e) => (errRes = e) });
    const reqInfo = { method: 'GET', url: `${chatsUrl}/members/${memberProfileId}` };
    const req = httpTesting.expectOne(reqInfo, 'Request to find a chat by member id');
    req.flush([chat]);
    expect(errRes).toBeUndefined();
    expect(res).toBeInstanceOf(Promise);
    expect(navigationSpy).toHaveBeenCalledTimes(0);
    await expect(res).resolves.toBe(false);
    httpTesting.verify();
  });

  it('should create a chat, then reload the chats', () => {
    const { service, httpTesting } = setup();
    const newChatData = { profiles: [crypto.randomUUID()], message: { body: 'Hello!' } };
    let res, errRes;
    service
      .createChat(newChatData)
      .subscribe({ next: (d) => (res = d), error: (e) => (errRes = e) });
    const req = httpTesting.expectOne(
      { method: 'POST', url: chatsUrl },
      'Request to create a chat',
    );
    const reqBody = req.request.body as FormData;
    req.flush(chat);
    expect(reqBody).toBeInstanceOf(FormData);
    expect(Object.fromEntries(reqBody.entries())).toStrictEqual({
      'message[body]': newChatData.message.body,
      'profiles[0]': newChatData.profiles[0],
    });
    expect(res).toBeInstanceOf(HttpResponse);
    expect(res).toHaveProperty('body', chat);
    expect(errRes).toBeUndefined();
    expect(navigationSpy).toHaveBeenCalledExactlyOnceWith(['/chats', chat.id], { state: { chat } });
    httpTesting.expectOne({ method: 'GET', url: chatsUrl }, 'Request to reload chats');
    httpTesting.verify();
  });

  it('should create a chat with image message, then reload the chats', () => {
    const { service, httpTesting } = setup();
    const newChatData = {
      profiles: [crypto.randomUUID()],
      message: {
        body: 'Hello!',
        image: new File([], 'img.png', { type: 'image/png' }),
        imagedata: { xPos: 7, yPos: 7 },
      },
    };
    let res, errRes;
    service
      .createChat(newChatData)
      .subscribe({ next: (d) => (res = d), error: (e) => (errRes = e) });
    const req = httpTesting.expectOne(
      { method: 'POST', url: chatsUrl },
      'Request to create a chat',
    );
    const reqBody = req.request.body as FormData;
    req.flush(chat);
    expect(reqBody.get('profiles[0]')).toBe(newChatData.profiles[0]);
    expect(reqBody.get('message[body]')).toBe(newChatData.message.body);
    expect(reqBody.get('image')).toStrictEqual(newChatData.message.image);
    expect(reqBody.get('message[imagedata][xPos]')).toBe(`${newChatData.message.imagedata.xPos}`);
    expect(reqBody.get('message[imagedata][yPos]')).toBe(`${newChatData.message.imagedata.yPos}`);
    expect(res).toBeInstanceOf(HttpResponse);
    expect(res).toHaveProperty('body', chat);
    expect(errRes).toBeUndefined();
    expect(navigationSpy).toHaveBeenCalledExactlyOnceWith(['/chats', chat.id], { state: { chat } });
    httpTesting.expectOne({ method: 'GET', url: chatsUrl }, 'Request to reload chats');
    httpTesting.verify();
  });

  it('should fail to create a chat due to a server error', () => {
    const { service, httpTesting } = setup();
    const newChatData = { profiles: [crypto.randomUUID()], message: { body: 'Hello!' } };
    let res, errRes;
    service
      .createChat(newChatData)
      .subscribe({ next: (d) => (res = d), error: (e) => (errRes = e) });
    const reqInfo = { method: 'POST', url: chatsUrl };
    const req = httpTesting.expectOne(reqInfo, 'Request to create a chat');
    const reqBody = req.request.body as FormData;
    req.flush('Failed', { status: 500, statusText: 'Internal server error' });
    httpTesting.expectNone({ method: 'GET', url: chatsUrl }, 'Request to get the chats');
    expect(reqBody).toBeInstanceOf(FormData);
    expect(Object.fromEntries(reqBody.entries())).toStrictEqual({
      'message[body]': newChatData.message.body,
      'profiles[0]': newChatData.profiles[0],
    });
    expect(navigationSpy).toHaveBeenCalledTimes(0);
    expect(errRes).toBeInstanceOf(HttpErrorResponse);
    expect(res).toHaveProperty('type', HttpEventType.Sent);
    expect(errRes).toHaveProperty('error', 'Failed');
    expect(errRes).toHaveProperty('status', 500);
    httpTesting.verify();
  });

  it('should fail to create a chat due to a network error', () => {
    const { service, httpTesting } = setup();
    const newChatData = { profiles: [crypto.randomUUID()], message: { body: 'Hello!' } };
    let res, errRes;
    service
      .createChat(newChatData)
      .subscribe({ next: (d) => (res = d), error: (e) => (errRes = e) });
    const reqInfo = { method: 'POST', url: chatsUrl };
    const req = httpTesting.expectOne(reqInfo, 'Request to create a chat');
    const reqBody = req.request.body as FormData;
    const networkError = new ProgressEvent('Network error');
    req.error(networkError);
    httpTesting.expectNone({ method: 'GET', url: chatsUrl }, 'Request to get the chats');
    expect(reqBody).toBeInstanceOf(FormData);
    expect(Object.fromEntries(reqBody.entries())).toStrictEqual({
      'message[body]': newChatData.message.body,
      'profiles[0]': newChatData.profiles[0],
    });
    expect(navigationSpy).toHaveBeenCalledTimes(0);
    expect(errRes).toBeInstanceOf(HttpErrorResponse);
    expect(res).toHaveProperty('type', HttpEventType.Sent);
    expect(errRes).toHaveProperty('error', networkError);
    expect(errRes).toHaveProperty('status', 0);
    httpTesting.verify();
  });

  it('should generate a chat title as the other member profile name if the other member profile is null', () => {
    const { service } = setup();
    const testChat = structuredClone(chat);
    testChat.id = crypto.randomUUID();
    testChat.profiles[1].profile = null;
    testChat.profiles[1].profileId = null;
    expect(service.generateTitle(testChat, user)).toBe(testChat.profiles[1].profileName);
  });

  it('should generate a chat title as the other member name if the chat has 2 members', () => {
    const { service } = setup();
    expect(service.generateTitle(chat, user)).toBe(chat.profiles[1].profileName);
  });

  it('should generate a chat title as "other-name and another-name" if the chat has 3 members', () => {
    const { service } = setup();
    const testChat = structuredClone(chat);
    testChat.id = crypto.randomUUID();
    const testProfile = { ...profile, id: crypto.randomUUID() } as Profile;
    const testUser: User = {
      ...user,
      profile: testProfile,
      id: crypto.randomUUID(),
      username: 'test_user_x',
      fullname: 'Test User X',
    };
    testProfile.user = testUser;
    testChat.profiles.push({
      profileName: testUser.username,
      profileId: testProfile.id,
      profile: testProfile,
      chatId: testChat.id,
      joinedAt: now,
    });
    const expectedTitle = `${testChat.profiles[1].profileName} and ${testChat.profiles[2].profileName}`;
    expect(service.generateTitle(testChat, user)).toBe(expectedTitle);
  });

  it('should generate a chat title as a comma separated list of the other members names for chat group', () => {
    const { service } = setup();
    const testChat = structuredClone(chat);
    testChat.id = crypto.randomUUID();
    const otherMemberNames: string[] = [testChat.profiles[1].profileName];
    for (let i = 0; i < 2; i++) {
      const num = i + 1;
      const username = `test_user_x${num}`;
      const testProfile = { ...profile, id: crypto.randomUUID() } as Profile;
      const testUser: User = {
        ...user,
        username,
        profile: testProfile,
        id: crypto.randomUUID(),
        fullname: `Test User X${num}`,
      };
      testProfile.user = testUser;
      testChat.profiles.push({
        profileName: testUser.username,
        profileId: testProfile.id,
        profile: testProfile,
        chatId: testChat.id,
        joinedAt: now,
      });
      otherMemberNames.push(username);
    }
    const namesWithoutLast = otherMemberNames.slice(0, -1);
    const expectedTitle = `${namesWithoutLast.join(', ')}, and ${otherMemberNames.at(-1)}`;
    expect(service.generateTitle(testChat, user)).toBe(expectedTitle);
  });

  it('should generate a chat title as the first member profile name in case of solo-chat', () => {
    const { service } = setup();
    const testChat = structuredClone(chat);
    testChat.id = crypto.randomUUID();
    testChat.profiles.splice(1);
    expect(service.generateTitle(testChat, user)).toBe(testChat.profiles[0].profileName);
  });

  it('should return a list of the other chat profiles', () => {
    const { service } = setup();
    expect(service.getOtherProfiles(chat, user)).toStrictEqual(chat.profiles.slice(1));
  });

  it('should return the chat profiles list as is, if contains less than 2 profiles', () => {
    const { service } = setup();
    const testChat1 = { ...chat, profiles: [] };
    const testChat2 = { ...chat, profiles: chat.profiles.slice(1) };
    expect(service.getOtherProfiles(testChat1, user)).toBe(testChat1.profiles);
    expect(service.getOtherProfiles(testChat2, user)).toBe(testChat2.profiles);
  });

  it('should consider a chat dead if it is missing profiles for all the other members', () => {
    const { service } = setup();
    const testChat = structuredClone(chat);
    testChat.id = crypto.randomUUID();
    testChat.profiles[1].profile = null;
    testChat.profiles[1].profileId = null;
    service.list.set([chat, testChat]);
    expect(service.isDeadChat(testChat.id, user)).toBe(true);
  });

  it('should consider a chat alive if it is missing profiles for some of the other members', () => {
    const { service } = setup();
    const testChat = structuredClone(chat);
    testChat.id = crypto.randomUUID();
    testChat.profiles[1].profile = null;
    testChat.profiles[1].profileId = null;
    service.list.set([chat, testChat]);
    expect(service.isDeadChat(chat.id, user)).toBe(false);
  });

  it('should consider a self-chat alive', () => {
    const { service } = setup();
    const testChat = structuredClone(chat);
    testChat.id = crypto.randomUUID();
    testChat.profiles.splice(1);
    service.list.set([chat, testChat]);
    expect(service.isDeadChat(testChat.id, user)).toBe(false);
  });

  it('should get a chat from the current list', () => {
    const { service, httpTesting } = setup();
    service.list.set([chat]);
    let res, errRes;
    service.getChat(chatId).subscribe({ next: (d) => (res = d), error: (e) => (errRes = e) });
    httpTesting.expectNone(`${chatsUrl}/${chatId}`, 'Request to get the chat messages');
    expect(res).toStrictEqual(chat);
    expect(errRes).toBeUndefined();
    httpTesting.verify();
  });

  it('should get a chat from the backend', () => {
    const { service, httpTesting } = setup();
    service.list.set([chat]);
    const randChatId = crypto.randomUUID();
    const chat$ = service.getChat(randChatId);
    let res, errRes;
    chat$.subscribe({ next: (d) => (res = d), error: (e) => (errRes = e) });
    const reqInfo = { method: 'GET', url: `${chatsUrl}/${randChatId}` };
    const req = httpTesting.expectOne(reqInfo, 'Request to get the chat messages');
    const resBody = { ...chat, id: randChatId };
    req.flush(resBody);
    expect(res).toStrictEqual(resBody);
    expect(errRes).toBeUndefined();
    httpTesting.verify();
  });

  it('should fail to get a chat from the backend due to a server error', () => {
    const { service, httpTesting } = setup();
    let res, errRes;
    service.getChat(chatId).subscribe({ next: (d) => (res = d), error: (e) => (errRes = e) });
    const reqInfo = { method: 'GET', url: `${chatsUrl}/${chatId}` };
    const req = httpTesting.expectOne(reqInfo, 'Request to get the chat messages');
    const error = 'Failed';
    req.flush(error, { status: 500, statusText: 'Internal server error' });
    expect(errRes).toBeInstanceOf(HttpErrorResponse);
    expect(errRes).toHaveProperty('error', error);
    expect(errRes).toHaveProperty('status', 500);
    expect(res).toBeUndefined();
    httpTesting.verify();
  });

  it('should fail to get a chat from the backend due to a network error', () => {
    const { service, httpTesting } = setup();
    let res, errRes;
    service.getChat(chatId).subscribe({ next: (d) => (res = d), error: (e) => (errRes = e) });
    const reqInfo = { method: 'GET', url: `${chatsUrl}/${chatId}` };
    const req = httpTesting.expectOne(reqInfo, 'Request to get the chat messages');
    const error = new ProgressEvent('Network error.');
    req.error(error);
    expect(errRes).toBeInstanceOf(HttpErrorResponse);
    expect(errRes).toHaveProperty('error', error);
    expect(errRes).toHaveProperty('status', 0);
    expect(res).toBeUndefined();
    httpTesting.verify();
  });

  it('should get a chat by member profile id from the current list', () => {
    const { service, httpTesting } = setup();
    service.list.set([{ ...chat, id: crypto.randomUUID(), profiles: [chat.profiles[0]] }, chat]);
    let res, errRes;
    service
      .getChatByMember(chat.profiles[1].profileId!)
      .subscribe({ next: (d) => (res = d), error: (e) => (errRes = e) });
    const url = `${chatsUrl}/members/${chat.profiles[1].profileId}`;
    httpTesting.expectNone(url, 'Request to get the chat messages');
    expect(res).toStrictEqual(chat);
    expect(errRes).toBeUndefined();
    httpTesting.verify();
  });

  it('should get a chat by member username from the current list', () => {
    const { service, httpTesting } = setup();
    service.list.set([{ ...chat, id: crypto.randomUUID(), profiles: [chat.profiles[0]] }, chat]);
    let res, errRes;
    service
      .getChatByMember(chat.profiles[1].profileName)
      .subscribe({ next: (d) => (res = d), error: (e) => (errRes = e) });
    const url = `${chatsUrl}/members/${chat.profiles[1].profileId}`;
    httpTesting.expectNone(url, 'Request to get the chat messages');
    expect(res).toStrictEqual(chat);
    expect(errRes).toBeUndefined();
    httpTesting.verify();
  });

  it('should get a chat by member profile id from the backend', () => {
    const { service, httpTesting } = setup();
    let res, errRes;
    service
      .getChatByMember(chat.profiles[1].profileId!)
      .subscribe({ next: (d) => (res = d), error: (e) => (errRes = e) });
    const reqInfo = { method: 'GET', url: `${chatsUrl}/members/${chat.profiles[1].profileId!}` };
    const req = httpTesting.expectOne(reqInfo, 'Request to get the chat messages');
    req.flush([{ ...chat, id: crypto.randomUUID(), profiles: [chat.profiles[0]] }, chat]);
    expect(errRes).toBeUndefined();
    expect(res).toStrictEqual(chat);
    httpTesting.verify();
  });

  it('should get a chat by member profile id from the backend', () => {
    const { service, httpTesting } = setup();
    let res, errRes;
    service
      .getChatByMember(chat.profiles[1].profileName)
      .subscribe({ next: (d) => (res = d), error: (e) => (errRes = e) });
    const reqInfo = { method: 'GET', url: `${chatsUrl}/members/${chat.profiles[1].profileName}` };
    const req = httpTesting.expectOne(reqInfo, 'Request to get the chat messages');
    req.flush([{ ...chat, id: crypto.randomUUID(), profiles: [chat.profiles[0]] }, chat]);
    expect(errRes).toBeUndefined();
    expect(res).toStrictEqual(chat);
    httpTesting.verify();
  });

  it('should fail to get a chat by member profile id from the backend due to a server error', () => {
    const { service, httpTesting } = setup();
    let res, errRes;
    service
      .getChatByMember(chat.profiles[1].profileId!)
      .subscribe({ next: (d) => (res = d), error: (e) => (errRes = e) });
    const reqInfo = { method: 'GET', url: `${chatsUrl}/members/${chat.profiles[1].profileId}` };
    const req = httpTesting.expectOne(reqInfo, 'Request to get the chat messages');
    const error = 'Failed';
    req.flush(error, { status: 500, statusText: 'Internal server error' });
    expect(errRes).toBeInstanceOf(HttpErrorResponse);
    expect(errRes).toHaveProperty('error', error);
    expect(errRes).toHaveProperty('status', 500);
    expect(res).toBeUndefined();
    httpTesting.verify();
  });

  it('should fail to get a chat by member profile id from the backend due to a network error', () => {
    const { service, httpTesting } = setup();
    let res, errRes;
    service
      .getChatByMember(chat.profiles[1].profileId!)
      .subscribe({ next: (d) => (res = d), error: (e) => (errRes = e) });
    const reqInfo = { method: 'GET', url: `${chatsUrl}/members/${chat.profiles[1].profileId}` };
    const req = httpTesting.expectOne(reqInfo, 'Request to get the chat messages');
    const error = new ProgressEvent('Network error.');
    req.error(error);
    expect(errRes).toBeInstanceOf(HttpErrorResponse);
    expect(errRes).toHaveProperty('error', error);
    expect(errRes).toHaveProperty('status', 0);
    expect(res).toBeUndefined();
    httpTesting.verify();
  });

  it('should get a chat messages', () => {
    const { service, httpTesting } = setup();
    let res, errRes;
    service.getMessages(chatId).subscribe({ next: (d) => (res = d), error: (e) => (errRes = e) });
    const reqInfo = { method: 'GET', url: `${chatsUrl}/${chatId}/messages` };
    const req = httpTesting.expectOne(reqInfo, 'Request to get the chat messages');
    req.flush([message, message]);
    expect(res).toStrictEqual([message, message]);
    expect(errRes).toBeUndefined();
    httpTesting.verify();
  });

  it('should fail to get a chat messages due to a server error', () => {
    const { service, httpTesting } = setup();
    let res, errRes;
    service.getMessages(chatId).subscribe({ next: (d) => (res = d), error: (e) => (errRes = e) });
    const reqInfo = { method: 'GET', url: `${chatsUrl}/${chatId}/messages` };
    const req = httpTesting.expectOne(reqInfo, 'Request to get the chat messages');
    const error = 'Failed';
    req.flush(error, { status: 500, statusText: 'Internal server error' });
    expect(errRes).toBeInstanceOf(HttpErrorResponse);
    expect(errRes).toHaveProperty('error', error);
    expect(errRes).toHaveProperty('status', 500);
    expect(res).toBeUndefined();
    httpTesting.verify();
  });

  it('should fail to get a chat messages due to a network error', () => {
    const { service, httpTesting } = setup();
    let res, errRes;
    service.getMessages(chatId).subscribe({ next: (d) => (res = d), error: (e) => (errRes = e) });
    const reqInfo = { method: 'GET', url: `${chatsUrl}/${chatId}/messages` };
    const req = httpTesting.expectOne(reqInfo, 'Request to get the chat messages');
    const error = new ProgressEvent('Network error.');
    req.error(error);
    expect(errRes).toBeInstanceOf(HttpErrorResponse);
    expect(errRes).toHaveProperty('error', error);
    expect(errRes).toHaveProperty('status', 0);
    expect(res).toBeUndefined();
    httpTesting.verify();
  });

  it('should get more of a chat messages', () => {
    const { service, httpTesting } = setup();
    let res, errRes;
    const cursor = message.id;
    service
      .getMessages(chatId, new HttpParams({ fromObject: { cursor } }))
      .subscribe({ next: (d) => (res = d), error: (e) => (errRes = e) });
    const reqInfo = { method: 'GET', url: `${chatsUrl}/${chatId}/messages?cursor=${cursor}` };
    const req = httpTesting.expectOne(reqInfo, 'Request to get more of the chat messages');
    req.flush([message, message]);
    expect(res).toStrictEqual([message, message]);
    expect(errRes).toBeUndefined();
    httpTesting.verify();
  });

  it('should fail to get more of a chat messages due to a server error', () => {
    const { service, httpTesting } = setup();
    let res, errRes;
    const cursor = message.id;
    service
      .getMessages(chatId, new HttpParams({ fromObject: { cursor } }))
      .subscribe({ next: (d) => (res = d), error: (e) => (errRes = e) });
    const reqInfo = { method: 'GET', url: `${chatsUrl}/${chatId}/messages?cursor=${cursor}` };
    const req = httpTesting.expectOne(reqInfo, 'Request to get more of the chat messages');
    const error = 'Failed';
    req.flush(error, { status: 500, statusText: 'Internal server error' });
    expect(errRes).toBeInstanceOf(HttpErrorResponse);
    expect(errRes).toHaveProperty('error', error);
    expect(errRes).toHaveProperty('status', 500);
    expect(res).toBeUndefined();
    httpTesting.verify();
  });

  it('should fail to get more of a chat messages due to a network error', () => {
    const { service, httpTesting } = setup();
    let res, errRes;
    const cursor = message.id;
    service
      .getMessages(chatId, new HttpParams({ fromObject: { cursor } }))
      .subscribe({ next: (d) => (res = d), error: (e) => (errRes = e) });
    const reqInfo = { method: 'GET', url: `${chatsUrl}/${chatId}/messages?cursor=${cursor}` };
    const req = httpTesting.expectOne(reqInfo, 'Request to get more of the chat messages');
    const error = new ProgressEvent('Network error.');
    req.error(error);
    expect(errRes).toBeInstanceOf(HttpErrorResponse);
    expect(errRes).toHaveProperty('error', error);
    expect(errRes).toHaveProperty('status', 0);
    expect(res).toBeUndefined();
    httpTesting.verify();
  });

  it('should create a message', () => {
    const { service, httpTesting } = setup();
    const chats = [chat, { ...chat, id: crypto.randomUUID(), messages: [] }];
    const newMessageData = { body: 'Hello!' } as NewMessageData;
    const activatedChat = chats[1];
    service.list.set(chats);
    service.activatedChat.set(activatedChat);
    const newMsg$ = service.createMessage(activatedChat.id, newMessageData);
    let res, errRes;
    newMsg$.subscribe({ next: (d) => (res = d), error: (e) => (errRes = e) });
    const reqInfo = { method: 'POST', url: `${chatsUrl}/${activatedChat.id}/messages` };
    const req = httpTesting.expectOne(reqInfo, 'Request to create a message');
    const reqBody = req.request.body as FormData;
    const createdMessage = { ...message, chatId: activatedChat.id };
    req.flush(createdMessage);
    const expectedChats = [
      {
        ...activatedChat,
        messages: [createdMessage],
        updatedAt: service.activatedChat()!.updatedAt,
      },
      chats[0],
    ];
    expect(errRes).toBeUndefined();
    expect(reqBody.get('image')).toBeNull();
    expect(reqBody).toBeInstanceOf(FormData);
    expect(reqBody.get('imagedata')).toBeNull();
    expect(reqBody.get('body')).toBe(newMessageData.body);
    expect(service.activatedChat()).toStrictEqual(expectedChats[0]);
    expect(service.list()).toStrictEqual(expectedChats);
    expect(res).toBeInstanceOf(HttpResponse);
    expect(res).toHaveProperty('body', createdMessage);
    httpTesting.expectOne(
      { method: 'GET', url: `${chatsUrl}?limit=${service.list().length}` },
      'Request to update chats with the current limit',
    );
    httpTesting.verify();
  });

  it('should create an image message', () => {
    const { service, httpTesting } = setup();
    const chats = [chat, { ...chat, id: crypto.randomUUID(), messages: [] }];
    const newMessageData = {
      body: 'Hello!',
      imagedata: { xPos: 7, yPos: 7 },
      image: new File([], 'img.png', { type: 'image/png' }),
    };
    const activatedChat = chats[1];
    service.list.set(chats);
    service.activatedChat.set(activatedChat);
    const newMsg$ = service.createMessage(activatedChat.id, newMessageData);
    let res, errRes;
    newMsg$.subscribe({ next: (d) => (res = d), error: (e) => (errRes = e) });
    const reqInfo = { method: 'POST', url: `${chatsUrl}/${activatedChat.id}/messages` };
    const req = httpTesting.expectOne(reqInfo, 'Request to create a message');
    const reqBody = req.request.body as FormData;
    const createdMessage = { ...message, chatId: activatedChat.id };
    req.flush(createdMessage);
    const expectedChats = [
      {
        ...activatedChat,
        messages: [createdMessage],
        updatedAt: service.activatedChat()!.updatedAt,
      },
      chats[0],
    ];
    expect(errRes).toBeUndefined();
    expect(reqBody).toBeInstanceOf(FormData);
    expect(reqBody.get('body')).toBe(newMessageData.body);
    expect(reqBody.get('image')).toBe(newMessageData.image);
    expect(reqBody.get('imagedata[xPos]')).toBe(`${newMessageData.imagedata.xPos}`);
    expect(reqBody.get('imagedata[yPos]')).toBe(`${newMessageData.imagedata.yPos}`);
    expect(service.activatedChat()).toStrictEqual(expectedChats[0]);
    expect(service.list()).toStrictEqual(expectedChats);
    expect(res).toBeInstanceOf(HttpResponse);
    expect(res).toHaveProperty('body', createdMessage);
    httpTesting.expectOne(
      { method: 'GET', url: `${chatsUrl}?limit=${service.list().length}` },
      'Request to update chats with the current limit',
    );
    httpTesting.verify();
  });

  it('should fail to create a message due to a server error', () => {
    const { service, httpTesting } = setup();
    const chats = [chat, { ...chat, id: crypto.randomUUID(), messages: [] }];
    const newMessageData = { body: 'Hello!' };
    const activatedChat = chats[1];
    service.list.set(chats);
    service.activatedChat.set(activatedChat);
    const newMsg$ = service.createMessage(activatedChat.id, newMessageData);
    let res, errRes;
    newMsg$.subscribe({ next: (d) => (res = d), error: (e) => (errRes = e) });
    const reqInfo = { method: 'POST', url: `${chatsUrl}/${activatedChat.id}/messages` };
    const req = httpTesting.expectOne(reqInfo, 'Request to create a message');
    const reqBody = req.request.body as FormData;
    const error = 'Failed';
    req.flush(error, { status: 500, statusText: 'Internal server error' });
    expect(reqBody).toBeInstanceOf(FormData);
    expect(Object.fromEntries(reqBody.entries())).toStrictEqual(newMessageData);
    expect(service.activatedChat()).toStrictEqual(activatedChat);
    expect(res).toHaveProperty('type', HttpEventType.Sent);
    expect(errRes).toBeInstanceOf(HttpErrorResponse);
    expect(errRes).toHaveProperty('error', error);
    expect(errRes).toHaveProperty('status', 500);
    expect(service.list()).toStrictEqual(chats);
    httpTesting.verify();
  });

  it('should fail to create a message due to a network error', () => {
    const { service, httpTesting } = setup();
    const chats = [chat, { ...chat, id: crypto.randomUUID(), messages: [] }];
    const newMessageData = { body: 'Hello!' };
    const activatedChat = chats[1];
    service.list.set(chats);
    service.activatedChat.set(activatedChat);
    const newMsg$ = service.createMessage(activatedChat.id, newMessageData);
    let res, errRes;
    newMsg$.subscribe({ next: (d) => (res = d), error: (e) => (errRes = e) });
    const reqInfo = { method: 'POST', url: `${chatsUrl}/${activatedChat.id}/messages` };
    const req = httpTesting.expectOne(reqInfo, 'Request to create a message');
    const reqBody = req.request.body as FormData;
    const error = new ProgressEvent('Network error');
    req.error(error);
    expect(reqBody).toBeInstanceOf(FormData);
    expect(service.activatedChat()).toStrictEqual(activatedChat);
    expect(Object.fromEntries(reqBody.entries())).toStrictEqual(newMessageData);
    expect(res).toHaveProperty('type', HttpEventType.Sent);
    expect(errRes).toBeInstanceOf(HttpErrorResponse);
    expect(errRes).toHaveProperty('error', error);
    expect(service.list()).toStrictEqual(chats);
    expect(errRes).toHaveProperty('status', 0);
    httpTesting.verify();
  });
});
