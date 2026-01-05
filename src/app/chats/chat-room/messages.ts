import { inject, signal, Injectable, DestroyRef, computed } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { createResErrorHandler } from '../../utils';
import { HttpParams } from '@angular/common/http';
import { Chat, Message } from '../chats.types';
import { Chats } from '../chats';
import { finalize } from 'rxjs';

@Injectable()
export class Messages {
  private readonly _destroyRef = inject(DestroyRef);

  readonly chats = inject(Chats);

  readonly list = computed<Message[]>(() => this.chats.activatedChat()?.messages || []);

  readonly loadingRecent = signal(false);
  readonly loadRecentError = signal('');
  readonly hasMore = signal(false);
  readonly loading = signal(false);
  readonly loadError = signal('');

  reset() {
    this.loadingRecent.set(false);
    this.loadRecentError.set('');
    this.hasMore.set(false);
    this.loading.set(false);
    this.loadError.set('');
    this.chats.deactivate();
  }

  init(chat: Chat, currentProfileName: string) {
    this.reset();
    this.hasMore.set(!!chat?.messages.length);
    this.chats.activate(chat, currentProfileName);
  }

  load(chatId: Chat['id']) {
    this.loading.set(true);
    this.loadError.set('');
    const list = this.list();
    const cursor = list[list.length - 1]?.id;
    const params = new HttpParams({ fromObject: { cursor, sort: 'desc' } });
    this.chats
      .getChatMessages(chatId, params)
      .pipe(
        takeUntilDestroyed(this._destroyRef),
        finalize(() => this.loading.set(false))
      )
      .subscribe({
        next: (olderList) => {
          this.hasMore.set(!!olderList.length);
          if (this.hasMore()) this.chats.updateChatMessages(chatId, olderList);
        },
        error: createResErrorHandler(this.loadError, 'Failed to load any messages.'),
      });
  }

  loadRecent(chatId: Chat['id'], currentProfileName: Message['profileName']) {
    this.loadingRecent.set(true);
    this.loadRecentError.set('');
    const list = this.list();
    if (list.length < 1) {
      this.load(chatId);
    } else {
      const recentOtherMemberMessage = list.find((m) => m.profileName !== currentProfileName);
      const cursor = recentOtherMemberMessage?.id || list[0].id;
      this.chats
        .getChatMessages(chatId, new HttpParams({ fromObject: { cursor, sort: 'asc' } }))
        .pipe(
          takeUntilDestroyed(this._destroyRef),
          finalize(() => this.loadingRecent.set(false))
        )
        .subscribe({
          next: (newerList) => {
            const updated = this.chats.updateChatMessages(chatId, newerList.reverse());
            if (updated) this.loadRecent(chatId, currentProfileName);
          },
          error: createResErrorHandler(this.loadRecentError, 'Failed to update chat messages.'),
        });
    }
  }

  private _checkMessage(
    prop: 'lastSeenAt' | 'lastReceivedAt',
    msg: Message,
    chat: Chat,
    currentProfileName: string
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
