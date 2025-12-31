import { inject, signal, Injectable, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Chat, Message, NewMessageData } from '../chats.types';
import { createResErrorHandler } from '../../utils';
import { HttpParams } from '@angular/common/http';
import { finalize, tap } from 'rxjs';
import { Chats } from '../chats';

@Injectable()
export class Messages {
  private readonly _destroyRef = inject(DestroyRef);

  readonly list = signal<Message[]>([]);
  readonly loadingRecent = signal(false);
  readonly loadRecentError = signal('');
  readonly hasMore = signal(false);
  readonly loading = signal(false);
  readonly loadError = signal('');

  readonly chats = inject(Chats);

  private _updateList(newList: Message[]) {
    let updated = false;
    this.list.update((oldList) => {
      const updatedList = oldList
        .filter((oldMsg) => !newList.some((newMsg) => newMsg.id === oldMsg.id))
        .concat(newList)
        .sort((a, b) => -1 * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()));
      updated = oldList.length !== updatedList.length;
      return updatedList;
    });
    return updated;
  }

  reset() {
    this.loadingRecent.set(false);
    this.loadRecentError.set('');
    this.hasMore.set(false);
    this.loading.set(false);
    this.loadError.set('');
    this.list.set([]);
  }

  init(chat: Chat | null) {
    this.reset();
    if (chat) {
      this.list.set(chat.messages);
      this.hasMore.set(!!chat.messages.length);
    }
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
          if (this.hasMore()) this._updateList(olderList);
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
            const updated = this._updateList(newerList.reverse());
            if (updated) this.loadRecent(chatId, currentProfileName);
          },
          error: createResErrorHandler(this.loadRecentError, 'Failed to update chat messages.'),
        });
    }
  }

  create(chatId: Chat['id'], data: NewMessageData) {
    return this.chats.createMessage(chatId, data).pipe(
      takeUntilDestroyed(this._destroyRef),
      tap((message) => this._updateList([message]))
    );
  }
}
