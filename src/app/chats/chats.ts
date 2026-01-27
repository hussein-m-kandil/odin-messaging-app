import { createChatFormData, findChatByAllMemberIds, createMessageFormData } from './chats.utils';
import { Chat, Message, ChatProfile, NewChatData, NewMessageData } from './chats.types';
import { HttpEventType, HttpClient, HttpParams } from '@angular/common/http';
import { inject, signal, DestroyRef, Injectable } from '@angular/core';
import { of, map, tap, defer, catchError, Subscription } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { mergeDistinctBy, sortByDate } from '../utils';
import { environment } from '../../environments';
import { ListStore } from '../list/list-store';
import { User, Profile } from '../app.types';
import { Router } from '@angular/router';
import { Auth } from '../auth';

const { apiUrl } = environment;

@Injectable({
  providedIn: 'root',
})
export class Chats extends ListStore<Chat> {
  private readonly _destroyRef = inject(DestroyRef);
  private readonly _http = inject(HttpClient);
  private readonly _router = inject(Router);
  private readonly _auth = inject(Auth);

  private _updateSubscription: Subscription | null = null;

  protected override loadErrorMessage = 'Failed to load any chats.';

  readonly activatedChat = signal<Chat | null>(null);

  readonly baseUrl = `${apiUrl}/chats`;

  protected override getMore() {
    const list = this.list();
    const cursor = list[list.length - 1]?.id;
    const options = cursor ? { params: { cursor } } : {};
    return this._http.get<Chat[]>(this.baseUrl, options).pipe(takeUntilDestroyed(this._destroyRef));
  }

  override reset() {
    this.activatedChat.set(null);
    super.reset();
  }

  activate(chat: Chat) {
    this.activatedChat.set(chat);
    this.updateChatLastSeenDate(chat.id);
  }

  deactivate() {
    this.activatedChat.set(null);
  }

  getChat(chatId: Chat['id']) {
    return defer(() => {
      const foundChat = this.list().find((chat) => chat.id === chatId);
      if (foundChat) return of(foundChat);
      return this._http.get<Chat>(`${this.baseUrl}/${chatId}`);
    });
  }

  getChatByMemberProfileId(memberProfileId: Profile['id'], userProfileId: Profile['id']) {
    return defer(() => {
      const foundChat = findChatByAllMemberIds(this.list(), [memberProfileId, userProfileId]);
      if (foundChat) return of(foundChat);
      return this._http
        .get<Chat[]>(`${this.baseUrl}/members/${memberProfileId}`)
        .pipe(
          map((chats) => findChatByAllMemberIds(chats, [memberProfileId, userProfileId]) || null),
        );
    });
  }

  navigateToChatByMemberProfileId(...args: Parameters<typeof this.getChatByMemberProfileId>) {
    return this.getChatByMemberProfileId(...args).pipe(
      map((chat) => {
        if (chat) return this._router.navigate(['/chats', chat.id]);
        return Promise.resolve(false);
      }),
    );
  }

  updateChats() {
    const limit = this.list().length;
    if (!this._updateSubscription && limit) {
      this._updateSubscription = this._http
        .get<Chat[]>(this.baseUrl, { params: { limit } })
        .pipe(
          takeUntilDestroyed(this._destroyRef),
          catchError(() => of(null)),
        )
        .subscribe((newChats) => {
          // No need for next/error blocks, because any error will be caught and get here as a null
          this._updateSubscription = null;
          if (newChats && newChats.length) {
            const oldChats = this.list();
            const extraChats = newChats.filter((nc) => !oldChats.some((oc) => oc.id === nc.id));
            const updatedChats = oldChats.map((oldChat) => {
              const updatedChat = newChats.find((newChat) => newChat.id === oldChat.id);
              const activatedChat = this.activatedChat();
              if (updatedChat && activatedChat && updatedChat.id === activatedChat.id) {
                const updatedActivatedChat = {
                  ...updatedChat,
                  messages: sortByDate(
                    mergeDistinctBy(updatedChat.messages, activatedChat.messages, (msg) => msg.id),
                    (msg) => msg.createdAt,
                  ),
                };
                this.activatedChat.set(updatedActivatedChat);
                return updatedActivatedChat;
              }
              return updatedChat || oldChat;
            });
            this.list.set(
              sortByDate(
                mergeDistinctBy(extraChats, updatedChats, (chat) => chat.id),
                (chat) => chat.updatedAt,
              ),
            );
            if (extraChats.length) this.updateChats(); // Update again with the extended limit
          }
        });
    }
  }

  updateChatLastSeenDate(chatId: Chat['id']) {
    this._http
      .patch<ChatProfile['lastSeenAt']>(`${this.baseUrl}/${chatId}/seen`, '')
      .pipe(
        takeUntilDestroyed(this._destroyRef),
        catchError(() => of(null)),
      )
      .subscribe((lastSeenAt) => {
        const user = this._auth.user();
        if (lastSeenAt && user) {
          const update = (c: Chat, n: ChatProfile['profileName'], d: ChatProfile['lastSeenAt']) =>
            c.id === chatId
              ? {
                  ...c,
                  profiles: c.profiles.map((cp) =>
                    cp.profileName === n ? { ...cp, lastSeenAt: d } : cp,
                  ),
                }
              : c;
          this.list.update((chats) => chats.map((chat) => update(chat, user.username, lastSeenAt)));
          this.activatedChat.update((chat) => chat && update(chat, user.username, lastSeenAt));
        }
        this.updateChats();
      });
  }

  getMessages(chatId: Chat['id'], params?: HttpParams) {
    return this._http.get<Message[]>(`${this.baseUrl}/${chatId}/messages`, { params });
  }

  updateMessages(newMessages: Message[]) {
    let updated = false;
    if (newMessages.length) {
      const chatId = newMessages[0].chatId;
      const activatedChat = this.activatedChat();
      const active = activatedChat && activatedChat.id === chatId;
      const oldChat = active ? activatedChat : this.list().find((c) => c.id === chatId);
      if (oldChat) {
        const oldMessages = oldChat.messages;
        const updatedMessages = sortByDate(
          mergeDistinctBy(newMessages, oldMessages, (msg) => msg.id),
          (msg) => msg.createdAt,
        );
        const updatedChat = {
          ...oldChat,
          messages: updatedMessages,
          updatedAt: new Date().toISOString(),
        };
        updated = oldMessages.length !== updatedMessages.length;
        this.list.update((chats) =>
          sortByDate(
            chats.map((chat) => (chat.id === updatedChat.id ? updatedChat : chat)),
            (chat) => chat.updatedAt,
          ),
        );
        if (active) this.activatedChat.set(updatedChat);
        this.updateChats();
      }
    }
    return updated;
  }

  createChat(data: NewChatData) {
    const body = createChatFormData(data);
    return this._http
      .post<Chat>(`${apiUrl}/chats`, body, { observe: 'events', reportProgress: true })
      .pipe(
        tap((event) => {
          if (event.type === HttpEventType.Response && event.body) {
            const createdChat = event.body;
            this.list.update((chats) => [createdChat, ...chats]);
            this._router.navigate(['/chats', createdChat.id]);
          }
        }),
      );
  }

  createMessage(chatId: Chat['id'], data: NewMessageData) {
    const body = createMessageFormData(data);
    return this._http
      .post<Message>(`${this.baseUrl}/${chatId}/messages`, body, {
        reportProgress: true,
        observe: 'events',
      })
      .pipe(
        takeUntilDestroyed(this._destroyRef),
        tap((event) => {
          if (event.type === HttpEventType.Response && event.body) {
            this.updateMessages([event.body]);
          }
        }),
      );
  }

  generateTitle(chat: Chat, currentUser: User) {
    const memberNames = chat.profiles.map((cp) => cp.profile?.user.username || cp.profileName);
    if (memberNames.length === 1) return memberNames[0];
    const otherMemberNames = memberNames.filter((name) => name !== currentUser.username);
    if (otherMemberNames.length > 1) {
      const lastName = otherMemberNames[otherMemberNames.length - 1];
      const namesWithoutLast = otherMemberNames.slice(0, -1);
      const lastDelimiter = `${otherMemberNames.length > 2 ? ',' : ''} and `;
      return `${namesWithoutLast.join(', ')}${lastDelimiter}${lastName}`;
    } else if (otherMemberNames.length === 1) {
      return otherMemberNames[0];
    }
    return 'Anonymous';
  }

  getOtherProfiles(chat: Chat, currentUser: User): ChatProfile[] {
    return chat.profiles.length < 2
      ? chat.profiles
      : chat.profiles.filter((cp) => cp.profileName !== currentUser.username);
  }

  isDeadChat(chatId: Chat['id'], currentUser: User) {
    const chat = this.list().find((c) => c.id === chatId);
    if (chat) {
      return (
        chat.profiles.length > 1 &&
        chat.profiles
          .filter((cp) => cp.profileId !== currentUser.profile.id)
          .filter((cp) => !!cp.profile).length < 1
      );
    }
    return false;
  }

  handleWindowFocus() {
    if (this._auth.user()) {
      const activatedChat = this.activatedChat();
      if (activatedChat) this.activate(activatedChat);
      else this.updateChats();
    }
  }
}
