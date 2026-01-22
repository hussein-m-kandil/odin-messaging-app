import {
  sort,
  subtract,
  createChatFormData,
  findChatByAllMemberIds,
  createMessageFormData,
} from './chats.utils';
import { Chat, Message, ChatProfile, NewChatData, NewMessageData } from './chats.types';
import { HttpEventType, HttpClient, HttpParams } from '@angular/common/http';
import { inject, signal, DestroyRef, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, defer, map, of, tap } from 'rxjs';
import { environment } from '../../environments';
import { ListStore } from '../list/list-store';
import { User, Profile } from '../app.types';
import { Router } from '@angular/router';

const { apiUrl } = environment;

@Injectable({
  providedIn: 'root',
})
export class Chats extends ListStore<Chat> {
  private readonly _destroyRef = inject(DestroyRef);
  private readonly _http = inject(HttpClient);
  private readonly _router = inject(Router);

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

  activate(chat: Chat, currentProfileName: string) {
    this.activatedChat.set(chat);
    this.updateChatLastSeenDate(chat.id, currentProfileName, () => this.updateChats());
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
    if (limit) {
      this._http
        .get<Chat[]>(this.baseUrl, { params: { limit } })
        .pipe(
          takeUntilDestroyed(this._destroyRef),
          catchError(() => of(null)),
        )
        .subscribe((newChats) => {
          if (newChats) {
            this.list.update((oldChats) =>
              oldChats.map((oldChat) => {
                const newChat = newChats.find((newChat) => newChat.id === oldChat.id);
                const activatedChat = this.activatedChat();
                if (newChat && activatedChat && newChat.id === activatedChat.id) {
                  const updatedChat = {
                    ...newChat,
                    messages: sort(
                      newChat.messages.concat(subtract(oldChat.messages, newChat.messages)),
                    ),
                  };
                  this.activatedChat.set(updatedChat);
                  return updatedChat;
                }
                return newChat || oldChat;
              }),
            );
          }
        });
    }
  }

  updateChatLastSeenDate(chatId: Chat['id'], currentProfileName: string, onUpdated?: () => void) {
    const updateChatProfileLastSeen = (chat: Chat, lastSeenAt: ChatProfile['lastSeenAt']) => {
      if (chat.id === chatId) {
        return {
          ...chat,
          profiles: chat.profiles.map((cp) =>
            cp.profileName === currentProfileName ? { ...cp, lastSeenAt } : cp,
          ),
        };
      }
      return chat;
    };
    this._http
      .patch<ChatProfile['lastSeenAt']>(`${this.baseUrl}/${chatId}/seen`, '')
      .pipe(
        takeUntilDestroyed(this._destroyRef),
        catchError(() => of(null)),
      )
      .subscribe((lastSeenAt) => {
        if (lastSeenAt) {
          this.activatedChat.update((chat) =>
            chat ? updateChatProfileLastSeen(chat, lastSeenAt) : chat,
          );
          this.list.update((chats) =>
            chats.map((chat) => updateChatProfileLastSeen(chat, lastSeenAt)),
          );
          onUpdated?.();
        }
      });
  }

  getChatMessages(chatId: Chat['id'], params?: HttpParams) {
    return this._http.get<Message[]>(`${this.baseUrl}/${chatId}/messages`, { params });
  }

  updateChatMessages(chatId: Chat['id'], newMessages: Message[]) {
    let updated = false;
    if (newMessages.length) {
      const activatedChat = this.activatedChat();
      const chatActivated = activatedChat && activatedChat.id === chatId;
      const oldChat = chatActivated ? activatedChat : this.list().find((c) => c.id === chatId);
      if (oldChat) {
        const oldMessages = oldChat.messages;
        const updatedMessages = sort(newMessages.concat(subtract(oldMessages, newMessages)));
        const updatedChat = { ...oldChat, messages: updatedMessages };
        if (chatActivated) this.activatedChat.set(updatedChat);
        this.list.update((chats) => {
          return chats.map((chat) => (chat.id === updatedChat.id ? updatedChat : chat));
        });
        updated = oldMessages.length !== updatedMessages.length;
        if (!updated) this.updateChats(); // Refresh after finishing updating messages
      }
    }
    return updated;
  }

  create(data: NewChatData) {
    const body = createChatFormData(data);
    return this._http
      .post<Chat>(`${apiUrl}/chats`, body, { observe: 'events', reportProgress: true })
      .pipe(
        tap((event) => {
          if (event.type === HttpEventType.Response && event.body) {
            this.load();
            this._router.navigate(['/chats', event.body.id]);
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
            this.updateChatMessages(chatId, [event.body]);
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
}
