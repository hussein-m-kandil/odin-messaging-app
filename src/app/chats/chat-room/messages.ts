import { inject, signal, Injectable, DestroyRef } from '@angular/core';
import { Chat, Message, NewMessageData } from '../chats.types';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { createResErrorHandler } from '../../utils';
import { finalize, tap } from 'rxjs';
import { Chats } from '../chats';

@Injectable()
export class Messages {
  private readonly _destroyRef = inject(DestroyRef);

  readonly list = signal<Message[]>([]);
  readonly hasMore = signal(false);
  readonly loading = signal(false);
  readonly loadError = signal('');

  readonly chats = inject(Chats);

  reset() {
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
    this.chats
      .getChatMessages(chatId, cursor)
      .pipe(
        takeUntilDestroyed(this._destroyRef),
        finalize(() => {
          this.loading.set(false);
        })
      )
      .subscribe({
        next: (newList) => {
          this.hasMore.set(!!newList.length);
          this.list.update((list) => [...list, ...newList]);
        },
        error: createResErrorHandler(this.loadError, 'Failed to load any messages.'),
      });
  }

  create(chatId: Chat['id'], data: NewMessageData) {
    return this.chats.createMessage(chatId, data).pipe(
      takeUntilDestroyed(this._destroyRef),
      tap((message) => this.list.update((messages) => [message, ...messages]))
    );
  }
}
