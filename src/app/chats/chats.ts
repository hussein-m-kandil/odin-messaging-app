import {
  Chat,
  ChatProfile,
  Message,
  NewChatData,
  NewMessageData,
  Profile,
  User,
} from './chats.types';
import { inject, signal, computed, DestroyRef, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpClient, HttpParams } from '@angular/common/http';
import { catchError, defer, finalize, map, of, tap } from 'rxjs';
import { environment } from '../../environments';
import { createResErrorHandler } from '../utils';
import { Router } from '@angular/router';

const { apiUrl } = environment;

@Injectable({
  providedIn: 'root',
})
export class Chats {
  private readonly _destroyRef = inject(DestroyRef);
  private readonly _router = inject(Router);
  private readonly _http = inject(HttpClient);

  readonly activatedChat = signal<Chat | null>(null);

  readonly list = signal<Chat[]>([]);
  readonly loading = signal(false);
  readonly loadError = signal('');

  readonly loadingMore = signal(false);
  readonly loadMoreError = signal('');
  readonly moreLoaded = signal(false);
  readonly hasMore = signal(false);

  readonly hasAnyLoadError = computed(() => {
    const loadError = this.loadError();
    const loadMoreError = this.loadMoreError();
    return !!loadError || !!loadMoreError;
  });

  readonly canLoad = computed(() => {
    const loadingMore = this.loadingMore();
    const loading = this.loading();
    return !loading && !loadingMore;
  });

  readonly canLoadMore = computed(() => {
    const canLoad = this.canLoad();
    const hasMore = this.hasMore();
    return canLoad && !!hasMore;
  });

  readonly baseUrl = `${apiUrl}/chats`;

  private _sortMessages(messages: Message[]) {
    return messages.sort(
      (a, b) => -1 * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    );
  }

  private _subtractMessages(messages: Message[], subRef: Message[]) {
    return messages.filter((mA) => subRef.findIndex((mB) => mB.id === mA.id) < 0);
  }

  private _findChatByAllMemberIds(chats: Chat[], memberIds: Profile['id'][]) {
    return chats.find((chat) =>
      chat.profiles.every((c) => c.profileId && memberIds.includes(c.profileId))
    );
  }

  reset() {
    this.activatedChat.set(null);
    this.loadingMore.set(false);
    this.loadMoreError.set('');
    this.moreLoaded.set(false);
    this.hasMore.set(false);
    this.loading.set(false);
    this.loadError.set('');
    this.list.set([]);
  }

  load(cursor?: Chat['id']) {
    const loadingMore = !!cursor;
    const options = loadingMore ? { params: { cursor } } : {};
    if (!loadingMore) this.list.set([]);
    this.loadingMore.set(loadingMore);
    this.loading.set(!loadingMore);
    this.loadMoreError.set('');
    this.loadError.set('');
    return this._http
      .get<Chat[]>(this.baseUrl, options)
      .pipe(
        takeUntilDestroyed(this._destroyRef),
        finalize(() => (loadingMore ? this.loadingMore.set(false) : this.loading.set(false)))
      )
      .subscribe({
        next: (newList) => {
          this.hasMore.set(!!newList.length);
          if (loadingMore) this.list.update((list) => [...list, ...newList]);
          else this.list.set(newList);
        },
        error: loadingMore
          ? createResErrorHandler(this.loadMoreError, 'Failed to load more chats.')
          : createResErrorHandler(this.loadError, 'Failed to load any chats.'),
      });
  }

  loadMore() {
    const list = this.list();
    const cursor: Chat['id'] | undefined = list[list.length - 1]?.id;
    this.load(cursor);
  }

  create(newChatData: NewChatData) {
    return this._http.post<Chat>(`${apiUrl}/chats`, newChatData).pipe(
      tap((chat) => {
        this.load();
        this._router.navigate(['/chats', chat.id]);
      })
    );
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
      const foundChat = this._findChatByAllMemberIds(this.list(), [memberProfileId, userProfileId]);
      if (foundChat) return of(foundChat);
      return this._http
        .get<Chat[]>(`${this.baseUrl}/members/${memberProfileId}`)
        .pipe(
          map(
            (chats) => this._findChatByAllMemberIds(chats, [memberProfileId, userProfileId]) || null
          )
        );
    });
  }

  navigateToChatByMemberProfileId(...args: Parameters<typeof this.getChatByMemberProfileId>) {
    return this.getChatByMemberProfileId(...args).pipe(
      map((chat) => {
        if (chat) return this._router.navigate(['/chats', chat.id]);
        return Promise.resolve(false);
      })
    );
  }

  updateChats() {
    const limit = this.list().length;
    if (limit) {
      this._http
        .get<Chat[]>(this.baseUrl, { params: { limit } })
        .pipe(
          takeUntilDestroyed(this._destroyRef),
          catchError(() => of(null))
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
                    messages: this._sortMessages(
                      newChat.messages.concat(
                        this._subtractMessages(oldChat.messages, newChat.messages)
                      )
                    ),
                  };
                  this.activatedChat.set(updatedChat);
                  return updatedChat;
                }
                return newChat || oldChat;
              })
            );
          }
        });
    } else {
      this.load();
    }
  }

  updateChatLastSeenDate(chatId: Chat['id'], currentProfileName: string, onUpdated?: () => void) {
    const updateChatProfileLastSeen = (chat: Chat, lastSeenAt: ChatProfile['lastSeenAt']) => {
      if (chat.id === chatId) {
        return {
          ...chat,
          profiles: chat.profiles.map((cp) =>
            cp.profileName === currentProfileName ? { ...cp, lastSeenAt } : cp
          ),
        };
      }
      return chat;
    };
    this._http
      .patch<ChatProfile['lastSeenAt']>(`${this.baseUrl}/${chatId}/seen`, '')
      .pipe(
        takeUntilDestroyed(this._destroyRef),
        catchError(() => of(null))
      )
      .subscribe((lastSeenAt) => {
        if (lastSeenAt) {
          this.activatedChat.update((chat) =>
            chat ? updateChatProfileLastSeen(chat, lastSeenAt) : chat
          );
          this.list.update((chats) =>
            chats.map((chat) => updateChatProfileLastSeen(chat, lastSeenAt))
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
    const activatedChat = this.activatedChat();
    const chatActivated = activatedChat && activatedChat.id === chatId;
    const oldChat = chatActivated ? activatedChat : this.list().find((c) => c.id === chatId);
    if (oldChat) {
      const oldMessages = oldChat.messages;
      const updatedMessages = this._sortMessages(
        newMessages.concat(this._subtractMessages(oldMessages, newMessages))
      );
      const updatedChat = { ...oldChat, messages: updatedMessages };
      if (chatActivated) this.activatedChat.set(updatedChat);
      this.list.update((chats) => {
        return chats.map((chat) => (chat.id === updatedChat.id ? updatedChat : chat));
      });
      updated = oldMessages.length !== updatedMessages.length;
      if (!updated) this.updateChats(); // Refresh after finishing updating messages
    }
    return updated;
  }

  createMessage(chatId: Chat['id'], data: NewMessageData) {
    return this._http.post<Message>(`${this.baseUrl}/${chatId}/messages`, data).pipe(
      takeUntilDestroyed(this._destroyRef),
      tap((message) => this.updateChatMessages(chatId, [message]))
    );
  }

  generateTitle(chat: Chat, currentUser: User) {
    const memberNames = chat.profiles.map((cp) => cp.profile?.user.username || cp.profileName);
    const otherMemberNames = memberNames.filter((name) => name !== currentUser.username);
    if (otherMemberNames.length > 1) {
      const lastName = otherMemberNames[otherMemberNames.length - 1];
      const namesWithoutLast = otherMemberNames.slice(0, -1);
      const lastDelimiter = `${otherMemberNames.length > 2 ? ',' : ''} and `;
      return `${namesWithoutLast.join(', ')}${lastDelimiter}${lastName}`;
    }
    if (otherMemberNames.length < 1 && memberNames.length === 1) return 'Yourself';
    if (otherMemberNames.length === 1) return otherMemberNames[0];
    return '';
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
