import { inject, signal, Injectable, DestroyRef, linkedSignal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { createResErrorHandler } from '../../utils';
import { HttpParams } from '@angular/common/http';
import { ListStore } from '../../list/list-store';
import { Chat, Message } from '../chats.types';
import { finalize, of } from 'rxjs';
import { Chats } from '../chats';

@Injectable()
export class Messages extends ListStore<Message> {
  private readonly _destroyRef = inject(DestroyRef);

  protected override loadErrorMessage = 'Failed to load any messages.';

  readonly chats = inject(Chats);

  override readonly list = linkedSignal(() => this.chats.activatedChat()?.messages || []);

  readonly loadingRecent = signal(false);
  readonly loadRecentError = signal('');

  protected override getMore() {
    const activatedChat = this.chats.activatedChat();
    if (activatedChat) {
      const list = this.list();
      const cursor = list[list.length - 1]?.id;
      const params = new HttpParams({ fromObject: { cursor, sort: 'desc' } });
      return this.chats
        .getMessages(activatedChat.id, params)
        .pipe(takeUntilDestroyed(this._destroyRef));
    }
    return of([]);
  }

  protected override updateList(olderMessages: Message[]): void {
    this.chats.updateMessages(olderMessages);
  }

  override reset() {
    super.reset();
    this.loadingRecent.set(false);
    this.loadRecentError.set('');
    this.chats.deactivate();
  }

  init(chat: Chat) {
    this.reset();
    this.hasMore.set(!!chat?.messages.length);
    this.chats.activate(chat);
  }

  loadRecent(chatId: Chat['id'], currentProfileName: Message['profileName']) {
    this.loadingRecent.set(true);
    this.loadRecentError.set('');
    const list = this.list();
    if (list.length < 1) {
      this.load();
    } else {
      const recentOtherMemberMessage = list.find((m) => m.profileName !== currentProfileName);
      const cursor = recentOtherMemberMessage?.id || list[0].id;
      this.chats
        .getMessages(chatId, new HttpParams({ fromObject: { cursor, sort: 'asc' } }))
        .pipe(
          takeUntilDestroyed(this._destroyRef),
          finalize(() => this.loadingRecent.set(false)),
        )
        .subscribe({
          next: (newerList) => {
            if (newerList.length) {
              const updated = this.chats.updateMessages(newerList.reverse());
              if (updated) this.loadRecent(chatId, currentProfileName);
            }
          },
          error: createResErrorHandler(this.loadRecentError, 'Failed to update chat messages.'),
        });
    }
  }

  private _checkMessage(
    prop: 'lastSeenAt' | 'lastReceivedAt',
    msg: Message,
    chat: Chat,
    currentProfileName: string,
  ) {
    const check = (chat: Chat) =>
      chat.profiles
        .filter((p) => p.profileName !== currentProfileName)
        .every((p) => p[prop] && new Date(msg.createdAt) <= new Date(p[prop]));
    const activatedChat = this.chats.activatedChat();
    return activatedChat ? check(activatedChat) || check(chat) : check(chat);
  }

  hasBeenReceived(msg: Message, chat: Chat, currentProfileName: string) {
    return this._checkMessage('lastReceivedAt', msg, chat, currentProfileName);
  }

  hasBeenSeen(msg: Message, chat: Chat, currentProfileName: string) {
    return this._checkMessage('lastSeenAt', msg, chat, currentProfileName);
  }
}
