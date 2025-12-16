import { inject, signal, DestroyRef, Injectable, computed } from '@angular/core';
import { Chat, NewChatData, Profile, User } from './chats.types';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments';
import { createResErrorHandler } from '../utils';
import { finalize, map, tap } from 'rxjs';
import { Router } from '@angular/router';

const { apiUrl } = environment;

@Injectable({
  providedIn: 'root',
})
export class Chats {
  private readonly _destroyRef = inject(DestroyRef);
  private readonly _router = inject(Router);
  private readonly _http = inject(HttpClient);

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

  reset() {
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

  navigateToChatByMemberProfileId(memberProfileId: Profile['id'], userProfileId: Profile['id']) {
    return this._http.get<Chat[]>(`${this.baseUrl}/members/${memberProfileId}`).pipe(
      map((chats) => {
        const chat = chats.find(
          (chat) =>
            chat.profiles.length === 2 &&
            chat.profiles.every(
              (c) => c.profileId === userProfileId || c.profileId === memberProfileId
            )
        );
        if (chat) return this._router.navigate(['/chats', chat.id]);
        return Promise.resolve(false);
      })
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
