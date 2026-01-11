import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { HttpErrorResponse, HttpParams, provideHttpClient } from '@angular/common/http';
import { Chat, Message, NewMessageData } from './chats.types';
import { provideRouter, Router } from '@angular/router';
import { environment } from '../../environments';
import { TestBed } from '@angular/core/testing';
import { Profile, User } from '../app.types';
import { Component } from '@angular/core';
import { Chats } from './chats';

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

const profileName = profile.user.username;

const { apiUrl } = environment;
const chatsUrl = `${apiUrl}/chats`;

const message = { id: crypto.randomUUID(), body: 'Hi!' } as Message;
const newMessageData = { body: 'Hello!' } as NewMessageData;

const navigationSpy = vi.spyOn(Router.prototype, 'navigate');

@Component({ selector: 'app-route-component-mock', template: '<div>Route Component Mock</div>' })
class RouteComponentMock {}

const setup = () => {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([{ path: '**', component: RouteComponentMock }]),
    ],
  });
  const httpTesting = TestBed.inject(HttpTestingController);
  const service = TestBed.inject(Chats);
  return { service, httpTesting };
};

describe('Chats', () => {
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
    const { service } = setup();
    service.activate(chat, profileName);
    expect(service.activatedChat()).toStrictEqual(chat);
  });

  it('should activate chat, and update the chat profile last-seen date', () => {
    const { service, httpTesting } = setup();
    const chats = [chat];
    service.list.set(chats);
    service.activate(chat, chat.profiles[0].profileName);
    const req = httpTesting.expectOne(
      { method: 'PATCH', url: `${chatsUrl}/${chat.id}/seen` },
      'Request to update the chat profile last-seen date.'
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
      'Request to update chats'
    );
    httpTesting.verify();
  });

  it('should activate chat, and silently fail to update the chat profile last-seen date due to a network error', () => {
    const { service, httpTesting } = setup();
    service.list.set([chat]);
    service.activate(chat, chat.profiles[0].profileName);
    const req = httpTesting.expectOne(
      { method: 'PATCH', url: `${chatsUrl}/${chat.id}/seen` },
      'Request to update the chat profile last-seen date.'
    );
    req.error(new ProgressEvent('Network error'));
    expect(service.activatedChat()).toStrictEqual(chat);
    expect(service.list()).toStrictEqual([chat]);
    httpTesting.verify();
  });

  it('should activate chat, and silently fail to update the chat profile last-seen date due to a backend error', () => {
    const { service, httpTesting } = setup();
    service.list.set([chat]);
    service.activate(chat, chat.profiles[0].profileName);
    const req = httpTesting.expectOne(
      { method: 'PATCH', url: `${chatsUrl}/${chat.id}/seen` },
      'Request to update the chat profile last-seen date.'
    );
    req.flush('Failed', { status: 500, statusText: 'Internal server error' });
    expect(service.activatedChat()).toStrictEqual(chat);
    expect(service.list()).toStrictEqual([chat]);
    httpTesting.verify();
  });

  it('should update and sort the activated chat messages, without duplications, and return `true`', () => {
    const messages: Message[] = [];
    for (let i = 0; i < 3; i++) {
      messages[i] = {
        createdAt: new Date(Date.now() - i).toISOString(),
        id: crypto.randomUUID(),
        body: 'blah',
      } as Message;
    }
    const { service } = setup();
    service.activate({ ...chat, messages: [messages[2], messages[0]] }, profileName);
    const updated = service.updateChatMessages(chatId, [messages[0], messages[1]]);
    expect(updated).toBe(true);
    expect({ ...service.activatedChat(), messages: [] }).toStrictEqual(chat);
    expect(service.activatedChat()!.messages).toStrictEqual(messages);
  });

  it('should sort the activated chat messages, without duplications, and return `false`', () => {
    const messages: Message[] = [];
    for (let i = 0; i < 3; i++) {
      messages[i] = {
        createdAt: new Date(Date.now() - i).toISOString(),
        id: crypto.randomUUID(),
        body: 'blah',
      } as Message;
    }
    const { service } = setup();
    service.activate({ ...chat, messages: [messages[2], messages[0], messages[1]] }, profileName);
    const updated = service.updateChatMessages(chatId, [messages[0], messages[1]]);
    expect(updated).toBe(false);
    expect({ ...service.activatedChat(), messages: [] }).toStrictEqual(chat);
    expect(service.activatedChat()!.messages).toStrictEqual(messages);
  });

  it('should not update the activated chat messages, and return `false`', () => {
    const { service } = setup();
    const updated = service.updateChatMessages(chatId, [
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
    const messages: Message[] = [];
    for (let i = 0; i < 3; i++) {
      messages[i] = {
        createdAt: new Date(Date.now() - i).toISOString(),
        id: crypto.randomUUID(),
        body: 'blah',
      } as Message;
    }
    const chatList = [chat, { ...chat, id: crypto.randomUUID() }];
    const { service } = setup();
    service.list.set(chatList);
    service.activate(chatList[0], profileName);
    const updated = service.updateChatMessages(chatId, messages);
    const updatedChat = { ...chatList[0], messages };
    expect(updated).toBe(true);
    expect(service.activatedChat()).toStrictEqual(updatedChat);
    expect(service.list()[0]).toStrictEqual(updatedChat);
    expect(service.list()[1]).toStrictEqual(chatList[1]);
  });

  it('should not update the activated chat messages if it has been changed, instead, update its corresponding chat in the chat list', () => {
    const messages: Message[] = [];
    for (let i = 0; i < 3; i++) {
      messages[i] = {
        createdAt: new Date(Date.now() - i).toISOString(),
        id: crypto.randomUUID(),
        body: 'blah',
      } as Message;
    }
    const chatList = [chat, { ...chat, id: crypto.randomUUID() }];
    const { service } = setup();
    service.list.set(chatList);
    service.activate(chatList[0], profileName);
    const updated = service.updateChatMessages(chatList[1].id, messages);
    expect(updated).toBe(true);
    expect(service.list()[1]).toStrictEqual({ ...chatList[1], messages });
    expect(service.activatedChat()).toStrictEqual(chatList[0]);
    expect(service.list()[0]).toStrictEqual(chatList[0]);
  });

  it('should keep the activated chat updates in the chat list, after deactivating', () => {
    const messages: Message[] = [];
    for (let i = 0; i < 3; i++) {
      messages[i] = {
        createdAt: new Date(Date.now() - i).toISOString(),
        id: crypto.randomUUID(),
        body: 'blah',
      } as Message;
    }
    const chatList = [chat, { ...chat, id: crypto.randomUUID() }];
    const { service } = setup();
    service.list.set(chatList);
    service.activate(chatList[0], profileName);
    const updated = service.updateChatMessages(chatId, messages);
    service.deactivate();
    expect(updated).toBe(true);
    expect(service.activatedChat()).toBeNull();
    expect(service.list()[1]).toStrictEqual(chatList[1]);
    expect(service.list()[0]).toStrictEqual({ ...chatList[0], messages });
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

  it('should load instead of update if the current chat list is empty', () => {
    const { service, httpTesting } = setup();
    service.updateChats();
    const req = httpTesting.expectOne({ method: 'GET', url: chatsUrl }, 'Request to load chats');
    req.flush([chat]);
    expect(service.list()).toStrictEqual([chat]);
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
    const req = httpTesting.expectOne(
      { method: 'GET', url: `${chatsUrl}?limit=${chats.length}` },
      'Request to update chats'
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
      { ...chat, id: crypto.randomUUID() },
      ...[
        { ...expectedChats[0], messages: [...[...expectedMessages].reverse()] },
        ...expectedChats.slice(1),
      ].reverse(),
    ]);
    expect(service.activatedChat()).toStrictEqual(expectedChats[0]);
    expect(service.list()).toStrictEqual(expectedChats);
    httpTesting.verify();
  });

  it('should fail, silently, to update chats due to a network error', () => {
    const { service, httpTesting } = setup();
    service.list.set([chat]);
    service.updateChats();
    const req = httpTesting.expectOne(
      { method: 'GET', url: `${chatsUrl}?limit=1` },
      'Request to update chats'
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
      'Request to update chats'
    );
    req.flush('Failed', { status: 500, statusText: 'Internal server error' });
    expect(service.list()).toStrictEqual([chat]);
    httpTesting.verify();
  });

  it('should navigate to old chat if got from the current list by member and user profile ids', async () => {
    const { service, httpTesting } = setup();
    service.list.set([chat]);
    const memberProfileId = profile2.id;
    const req$ = service.navigateToChatByMemberProfileId(memberProfileId, user.profile.id);
    let resData: unknown, resErr: unknown;
    req$.subscribe({ next: (d) => (resData = d), error: (e) => (resErr = e) });
    const url = `${chatsUrl}/members/${memberProfileId}`;
    httpTesting.expectNone(url, 'Request to find a chat by member id');
    expect(resErr).toBeUndefined();
    expect(resData).toBeInstanceOf(Promise);
    await expect(resData).resolves.toBe(true);
    expect(navigationSpy).toHaveBeenCalledExactlyOnceWith(['/chats', chat.id]);
    httpTesting.verify();
    navigationSpy.mockClear();
  });

  it('should navigate to old chat if got from the backend by member and user profile ids', async () => {
    const { service, httpTesting } = setup();
    const memberProfileId = profile2.id;
    const req$ = service.navigateToChatByMemberProfileId(memberProfileId, user.profile.id);
    let resData: unknown, resErr: unknown;
    req$.subscribe({ next: (d) => (resData = d), error: (e) => (resErr = e) });
    const reqInfo = { method: 'GET', url: `${chatsUrl}/members/${memberProfileId}` };
    const req = httpTesting.expectOne(reqInfo, 'Request to find a chat by member id');
    req.flush([chat]);
    expect(resErr).toBeUndefined();
    expect(resData).toBeInstanceOf(Promise);
    await expect(resData).resolves.toBe(true);
    expect(navigationSpy).toHaveBeenCalledExactlyOnceWith(['/chats', chat.id]);
    httpTesting.verify();
    navigationSpy.mockClear();
  });

  it('should not navigate to old chat if not found by member and user profile ids', async () => {
    const { service, httpTesting } = setup();
    const memberProfileId = profile.id;
    const req$ = service.navigateToChatByMemberProfileId(memberProfileId, user.profile.id);
    let resData: unknown, resErr: unknown;
    req$.subscribe({ next: (d) => (resData = d), error: (e) => (resErr = e) });
    const reqInfo = { method: 'GET', url: `${chatsUrl}/members/${memberProfileId}` };
    const req = httpTesting.expectOne(reqInfo, 'Request to find a chat by member id');
    req.flush([chat]);
    expect(resErr).toBeUndefined();
    expect(resData).toBeInstanceOf(Promise);
    expect(navigationSpy).toHaveBeenCalledTimes(0);
    await expect(resData).resolves.toBe(false);
    httpTesting.verify();
    navigationSpy.mockClear();
  });

  it('should create a chat', () => {
    const { service, httpTesting } = setup();
    const newChatData = { profiles: [crypto.randomUUID()], message: { body: 'Hello!' } };
    let resData, resErr;
    service
      .create(newChatData)
      .subscribe({ next: (d) => (resData = d), error: (e) => (resErr = e) });
    const reqInfo = { method: 'Post', url: chatsUrl };
    const req = httpTesting.expectOne(reqInfo, 'Request to create a chat');
    req.flush(chat);
    httpTesting
      .expectOne({ method: 'Get', url: chatsUrl }, 'Request to get the chats')
      .flush([chat]);
    expect(navigationSpy).toHaveBeenCalledExactlyOnceWith(['/chats', chat.id]);
    expect(resData).toStrictEqual(chat);
    expect(resErr).toBeUndefined();
    httpTesting.verify();
    navigationSpy.mockClear();
  });

  it('should fail to create a chat due to a server error', () => {
    const { service, httpTesting } = setup();
    const newChatData = { profiles: [crypto.randomUUID()], message: { body: 'Hello!' } };
    let resData, resErr;
    service
      .create(newChatData)
      .subscribe({ next: (d) => (resData = d), error: (e) => (resErr = e) });
    const reqInfo = { method: 'Post', url: chatsUrl };
    const req = httpTesting.expectOne(reqInfo, 'Request to create a chat');
    req.flush('Failed', { status: 500, statusText: 'Internal server error' });
    httpTesting.expectNone({ method: 'Get', url: chatsUrl }, 'Request to get the chats');
    expect(navigationSpy).toHaveBeenCalledTimes(0);
    expect(resErr).toBeInstanceOf(HttpErrorResponse);
    expect(resData).toBeUndefined();
    expect(resErr).toHaveProperty('status', 500);
    expect(resErr).toHaveProperty('error', 'Failed');
    httpTesting.verify();
    navigationSpy.mockClear();
  });

  it('should fail to create a chat due to a network error', () => {
    const { service, httpTesting } = setup();
    const newChatData = { profiles: [crypto.randomUUID()], message: { body: 'Hello!' } };
    let resData, resErr;
    service
      .create(newChatData)
      .subscribe({ next: (d) => (resData = d), error: (e) => (resErr = e) });
    const reqInfo = { method: 'Post', url: chatsUrl };
    const req = httpTesting.expectOne(reqInfo, 'Request to create a chat');
    const networkError = new ProgressEvent('Network error');
    req.error(networkError);
    httpTesting.expectNone({ method: 'Get', url: chatsUrl }, 'Request to get the chats');
    expect(navigationSpy).toHaveBeenCalledTimes(0);
    expect(resErr).toBeInstanceOf(HttpErrorResponse);
    expect(resData).toBeUndefined();
    expect(resErr).toHaveProperty('status', 0);
    expect(resErr).toHaveProperty('error', networkError);
    httpTesting.verify();
    navigationSpy.mockClear();
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

  it('should generate a chat title as "Yourself" in case of self-chat', () => {
    const { service } = setup();
    const testChat = structuredClone(chat);
    testChat.id = crypto.randomUUID();
    testChat.profiles.splice(1);
    expect(service.generateTitle(testChat, user)).toBe('Yourself');
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
    let resData, resErr;
    service.getChat(chatId).subscribe({ next: (d) => (resData = d), error: (e) => (resErr = e) });
    httpTesting.expectNone(`${chatsUrl}/${chatId}`, 'Request to get the chat messages');
    expect(resData).toStrictEqual(chat);
    expect(resErr).toBeUndefined();
    httpTesting.verify();
  });

  it('should get a chat from the backend', () => {
    const { service, httpTesting } = setup();
    service.list.set([chat]);
    const randChatId = crypto.randomUUID();
    const chat$ = service.getChat(randChatId);
    let resData, resErr;
    chat$.subscribe({ next: (d) => (resData = d), error: (e) => (resErr = e) });
    const reqInfo = { method: 'GET', url: `${chatsUrl}/${randChatId}` };
    const req = httpTesting.expectOne(reqInfo, 'Request to get the chat messages');
    const resBody = { ...chat, id: randChatId };
    req.flush(resBody);
    expect(resData).toStrictEqual(resBody);
    expect(resErr).toBeUndefined();
    httpTesting.verify();
  });

  it('should fail to get a chat from the backend due to a server error', () => {
    const { service, httpTesting } = setup();
    let resData, resErr;
    service.getChat(chatId).subscribe({ next: (d) => (resData = d), error: (e) => (resErr = e) });
    const reqInfo = { method: 'GET', url: `${chatsUrl}/${chatId}` };
    const req = httpTesting.expectOne(reqInfo, 'Request to get the chat messages');
    const error = 'Failed';
    req.flush(error, { status: 500, statusText: 'Internal server error' });
    expect(resErr).toBeInstanceOf(HttpErrorResponse);
    expect(resErr).toHaveProperty('error', error);
    expect(resErr).toHaveProperty('status', 500);
    expect(resData).toBeUndefined();
    httpTesting.verify();
  });

  it('should fail to get a chat from the backend due to a network error', () => {
    const { service, httpTesting } = setup();
    let resData, resErr;
    service.getChat(chatId).subscribe({ next: (d) => (resData = d), error: (e) => (resErr = e) });
    const reqInfo = { method: 'GET', url: `${chatsUrl}/${chatId}` };
    const req = httpTesting.expectOne(reqInfo, 'Request to get the chat messages');
    const error = new ProgressEvent('Network error.');
    req.error(error);
    expect(resErr).toBeInstanceOf(HttpErrorResponse);
    expect(resErr).toHaveProperty('error', error);
    expect(resErr).toHaveProperty('status', 0);
    expect(resData).toBeUndefined();
    httpTesting.verify();
  });

  it('should get a chat by member profile id from the current list', () => {
    const { service, httpTesting } = setup();
    service.list.set([chat]);
    let resData, resErr;
    service
      .getChatByMemberProfileId(chat.profiles[1].profileId!, chat.profiles[0].profileId!)
      .subscribe({ next: (d) => (resData = d), error: (e) => (resErr = e) });
    const url = `${chatsUrl}/members/${chat.profiles[1].profileId}`;
    httpTesting.expectNone(url, 'Request to get the chat messages');
    expect(resData).toStrictEqual(chat);
    expect(resErr).toBeUndefined();
    httpTesting.verify();
  });

  it('should get a chat by member profile id from the backend', () => {
    const { service, httpTesting } = setup();
    let resData, resErr;
    service
      .getChatByMemberProfileId(chat.profiles[1].profileId!, chat.profiles[0].profileId!)
      .subscribe({ next: (d) => (resData = d), error: (e) => (resErr = e) });
    const reqInfo = { method: 'GET', url: `${chatsUrl}/members/${chat.profiles[1].profileId!}` };
    const req = httpTesting.expectOne(reqInfo, 'Request to get the chat messages');
    req.flush([chat]);
    expect(resErr).toBeUndefined();
    expect(resData).toStrictEqual(chat);
    httpTesting.verify();
  });

  it('should fail to get a chat by member profile id from the backend due to a server error', () => {
    const { service, httpTesting } = setup();
    let resData, resErr;
    service
      .getChatByMemberProfileId(chat.profiles[1].profileId!, chat.profiles[0].profileId!)
      .subscribe({ next: (d) => (resData = d), error: (e) => (resErr = e) });
    const reqInfo = { method: 'GET', url: `${chatsUrl}/members/${chat.profiles[1].profileId}` };
    const req = httpTesting.expectOne(reqInfo, 'Request to get the chat messages');
    const error = 'Failed';
    req.flush(error, { status: 500, statusText: 'Internal server error' });
    expect(resErr).toBeInstanceOf(HttpErrorResponse);
    expect(resErr).toHaveProperty('error', error);
    expect(resErr).toHaveProperty('status', 500);
    expect(resData).toBeUndefined();
    httpTesting.verify();
  });

  it('should fail to get a chat by member profile id from the backend due to a network error', () => {
    const { service, httpTesting } = setup();
    let resData, resErr;
    service
      .getChatByMemberProfileId(chat.profiles[1].profileId!, chat.profiles[0].profileId!)
      .subscribe({ next: (d) => (resData = d), error: (e) => (resErr = e) });
    const reqInfo = { method: 'GET', url: `${chatsUrl}/members/${chat.profiles[1].profileId}` };
    const req = httpTesting.expectOne(reqInfo, 'Request to get the chat messages');
    const error = new ProgressEvent('Network error.');
    req.error(error);
    expect(resErr).toBeInstanceOf(HttpErrorResponse);
    expect(resErr).toHaveProperty('error', error);
    expect(resErr).toHaveProperty('status', 0);
    expect(resData).toBeUndefined();
    httpTesting.verify();
  });

  it('should get a chat messages', () => {
    const { service, httpTesting } = setup();
    let resData, resErr;
    service
      .getChatMessages(chatId)
      .subscribe({ next: (d) => (resData = d), error: (e) => (resErr = e) });
    const reqInfo = { method: 'GET', url: `${chatsUrl}/${chatId}/messages` };
    const req = httpTesting.expectOne(reqInfo, 'Request to get the chat messages');
    req.flush([message, message]);
    expect(resData).toStrictEqual([message, message]);
    expect(resErr).toBeUndefined();
    httpTesting.verify();
  });

  it('should fail to get a chat messages due to a server error', () => {
    const { service, httpTesting } = setup();
    let resData, resErr;
    service
      .getChatMessages(chatId)
      .subscribe({ next: (d) => (resData = d), error: (e) => (resErr = e) });
    const reqInfo = { method: 'GET', url: `${chatsUrl}/${chatId}/messages` };
    const req = httpTesting.expectOne(reqInfo, 'Request to get the chat messages');
    const error = 'Failed';
    req.flush(error, { status: 500, statusText: 'Internal server error' });
    expect(resErr).toBeInstanceOf(HttpErrorResponse);
    expect(resErr).toHaveProperty('error', error);
    expect(resErr).toHaveProperty('status', 500);
    expect(resData).toBeUndefined();
    httpTesting.verify();
  });

  it('should fail to get a chat messages due to a network error', () => {
    const { service, httpTesting } = setup();
    let resData, resErr;
    service
      .getChatMessages(chatId)
      .subscribe({ next: (d) => (resData = d), error: (e) => (resErr = e) });
    const reqInfo = { method: 'GET', url: `${chatsUrl}/${chatId}/messages` };
    const req = httpTesting.expectOne(reqInfo, 'Request to get the chat messages');
    const error = new ProgressEvent('Network error.');
    req.error(error);
    expect(resErr).toBeInstanceOf(HttpErrorResponse);
    expect(resErr).toHaveProperty('error', error);
    expect(resErr).toHaveProperty('status', 0);
    expect(resData).toBeUndefined();
    httpTesting.verify();
  });

  it('should get more of a chat messages', () => {
    const { service, httpTesting } = setup();
    let resData, resErr;
    const cursor = message.id;
    service
      .getChatMessages(chatId, new HttpParams({ fromObject: { cursor } }))
      .subscribe({ next: (d) => (resData = d), error: (e) => (resErr = e) });
    const reqInfo = { method: 'GET', url: `${chatsUrl}/${chatId}/messages?cursor=${cursor}` };
    const req = httpTesting.expectOne(reqInfo, 'Request to get more of the chat messages');
    req.flush([message, message]);
    expect(resData).toStrictEqual([message, message]);
    expect(resErr).toBeUndefined();
    httpTesting.verify();
  });

  it('should fail to get more of a chat messages due to a server error', () => {
    const { service, httpTesting } = setup();
    let resData, resErr;
    const cursor = message.id;
    service
      .getChatMessages(chatId, new HttpParams({ fromObject: { cursor } }))
      .subscribe({ next: (d) => (resData = d), error: (e) => (resErr = e) });
    const reqInfo = { method: 'GET', url: `${chatsUrl}/${chatId}/messages?cursor=${cursor}` };
    const req = httpTesting.expectOne(reqInfo, 'Request to get more of the chat messages');
    const error = 'Failed';
    req.flush(error, { status: 500, statusText: 'Internal server error' });
    expect(resErr).toBeInstanceOf(HttpErrorResponse);
    expect(resErr).toHaveProperty('error', error);
    expect(resErr).toHaveProperty('status', 500);
    expect(resData).toBeUndefined();
    httpTesting.verify();
  });

  it('should fail to get more of a chat messages due to a network error', () => {
    const { service, httpTesting } = setup();
    let resData, resErr;
    const cursor = message.id;
    service
      .getChatMessages(chatId, new HttpParams({ fromObject: { cursor } }))
      .subscribe({ next: (d) => (resData = d), error: (e) => (resErr = e) });
    const reqInfo = { method: 'GET', url: `${chatsUrl}/${chatId}/messages?cursor=${cursor}` };
    const req = httpTesting.expectOne(reqInfo, 'Request to get more of the chat messages');
    const error = new ProgressEvent('Network error.');
    req.error(error);
    expect(resErr).toBeInstanceOf(HttpErrorResponse);
    expect(resErr).toHaveProperty('error', error);
    expect(resErr).toHaveProperty('status', 0);
    expect(resData).toBeUndefined();
    httpTesting.verify();
  });

  it('should create a message', () => {
    const { service, httpTesting } = setup();
    const chats = [chat, { ...chat, id: crypto.randomUUID(), messages: [] }];
    const activatedChat = chats[1];
    service.list.set(chats);
    service.activatedChat.set(activatedChat);
    const newMsg$ = service.createMessage(activatedChat.id, newMessageData);
    let resData, resErr;
    newMsg$.subscribe({ next: (d) => (resData = d), error: (e) => (resErr = e) });
    const reqInfo = { method: 'POST', url: `${chatsUrl}/${activatedChat.id}/messages` };
    const req = httpTesting.expectOne(reqInfo, 'Request to create a message');
    const expectedChats = [chats[0], { ...chats[1], messages: [message] }];
    const expectedActivatedChat = expectedChats[1];
    req.flush(message);
    expect(service.activatedChat()).toStrictEqual(expectedActivatedChat);
    expect(service.list()).toStrictEqual(expectedChats);
    expect(resData).toStrictEqual(message);
    expect(resErr).toBeUndefined();
    httpTesting.verify();
  });

  it('should fail to create a message due to a server error', () => {
    const { service, httpTesting } = setup();
    const chats = [chat, { ...chat, id: crypto.randomUUID(), messages: [] }];
    const activatedChat = chats[1];
    service.list.set(chats);
    service.activatedChat.set(activatedChat);
    const newMsg$ = service.createMessage(activatedChat.id, newMessageData);
    let resData, resErr;
    newMsg$.subscribe({ next: (d) => (resData = d), error: (e) => (resErr = e) });
    const reqInfo = { method: 'POST', url: `${chatsUrl}/${activatedChat.id}/messages` };
    const req = httpTesting.expectOne(reqInfo, 'Request to create a message');
    const error = 'Failed';
    req.flush(error, { status: 500, statusText: 'Internal server error' });
    expect(service.activatedChat()).toStrictEqual(activatedChat);
    expect(resErr).toBeInstanceOf(HttpErrorResponse);
    expect(resErr).toHaveProperty('error', error);
    expect(resErr).toHaveProperty('status', 500);
    expect(service.list()).toStrictEqual(chats);
    expect(resData).toBeUndefined();
    httpTesting.verify();
  });

  it('should fail to create a message due to a network error', () => {
    const { service, httpTesting } = setup();
    const chats = [chat, { ...chat, id: crypto.randomUUID(), messages: [] }];
    const activatedChat = chats[1];
    service.list.set(chats);
    service.activatedChat.set(activatedChat);
    const newMsg$ = service.createMessage(activatedChat.id, newMessageData);
    let resData, resErr;
    newMsg$.subscribe({ next: (d) => (resData = d), error: (e) => (resErr = e) });
    const reqInfo = { method: 'POST', url: `${chatsUrl}/${activatedChat.id}/messages` };
    const req = httpTesting.expectOne(reqInfo, 'Request to create a message');
    const error = new ProgressEvent('Network error');
    req.error(error);
    expect(service.activatedChat()).toStrictEqual(activatedChat);
    expect(resErr).toBeInstanceOf(HttpErrorResponse);
    expect(resErr).toHaveProperty('error', error);
    expect(service.list()).toStrictEqual(chats);
    expect(resErr).toHaveProperty('status', 0);
    expect(resData).toBeUndefined();
    httpTesting.verify();
  });
});
