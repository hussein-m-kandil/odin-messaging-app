import { inject, signal, Injectable, DestroyRef, computed } from '@angular/core';
import { Chat, Message, NewMessageData, Profile } from '../chats.types';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { createResErrorHandler } from '../../utils';
import { HttpClient } from '@angular/common/http';
import { finalize, tap } from 'rxjs';
import { Chats } from '../chats';

@Injectable()
export class Messages {
  private readonly _destroyRef = inject(DestroyRef);
  private readonly _http = inject(HttpClient);

  readonly list = signal<Message[]>([]);
  readonly loadingMore = signal(false);
  readonly loadMoreError = signal('');
  readonly moreLoaded = signal(false);
  readonly hasMore = signal(false);
  readonly loading = signal(false);
  readonly loadError = signal('');

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

  readonly chats = inject(Chats);

  reset() {
    this.loadingMore.set(false);
    this.loadMoreError.set('');
    this.moreLoaded.set(false);
    this.hasMore.set(false);
    this.loading.set(false);
    this.loadError.set('');
    this.list.set([]);
  }

  load(chatId: Chat['id'], cursor?: Message['id']) {
    const loadingMore = !!cursor;
    const options = loadingMore && cursor ? { params: { cursor } } : {};
    if (!loadingMore) this.list.set([]);
    this.loadingMore.set(loadingMore);
    this.loading.set(!loadingMore);
    this.moreLoaded.set(false);
    this.loadMoreError.set('');
    this.loadError.set('');
    this._http
      .get<Message[]>(`${this.chats.baseUrl}/${chatId}/messages`, options)
      .pipe(
        takeUntilDestroyed(this._destroyRef),
        finalize(() => {
          this.loading.set(false);
          this.loadingMore.set(false);
          this.moreLoaded.set(loadingMore);
        })
      )
      .subscribe({
        next: (newList) => {
          this.hasMore.set(!!newList.length);
          if (loadingMore) this.list.update((list) => [...list, ...newList]);
          else this.list.set(newList);
        },
        error: loadingMore
          ? createResErrorHandler(this.loadMoreError, 'Failed to load more messages.')
          : createResErrorHandler(this.loadError, 'Failed to load any messages.'),
      });
  }

  loadMore(chatId: Chat['id']) {
    const list = this.list();
    const cursor: Message['id'] | undefined = list[list.length - 1]?.id;
    this.load(chatId, cursor);
  }

  loadByMemberProfileId(memberProfileId: Profile['id'], userProfileId: Profile['id']) {
    this.loading.set(true);
    this.loadError.set('');
    this.chats
      .navigateToChatByMemberProfileId(memberProfileId, userProfileId)
      .pipe(
        takeUntilDestroyed(this._destroyRef),
        finalize(() => this.loading.set(false))
      )
      .subscribe({ error: createResErrorHandler(this.loadError, 'Failed to load any messages.') });
  }

  create(chatId: Chat['id'], data: NewMessageData) {
    return this._http.post<Message>(`${this.chats.baseUrl}/${chatId}/messages`, data).pipe(
      takeUntilDestroyed(this._destroyRef),
      tap((message) => this.list.update((messages) => [message, ...messages]))
    );
  }
}
