import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments';
import { createResErrorHandler } from '../utils';
import { Profile } from '../app.types';
import { finalize } from 'rxjs';

const { apiUrl } = environment;

@Injectable({
  providedIn: 'root',
})
export class Profiles {
  private readonly _destroyRef = inject(DestroyRef);
  private _http = inject(HttpClient);

  readonly list = signal<Profile[]>([]);
  readonly loadError = signal('');
  readonly loading = signal(false);

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

  load(cursor?: Profile['id']) {
    const loadingMore = !!cursor;
    const options = loadingMore ? { params: { cursor } } : {};
    if (!loadingMore) this.list.set([]);
    this.loadingMore.set(loadingMore);
    this.loading.set(!loadingMore);
    this.loadMoreError.set('');
    this.loadError.set('');
    this._http
      .get<Profile[]>(`${apiUrl}/profiles`, options)
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
          ? createResErrorHandler(this.loadMoreError, 'Failed to load more profiles.')
          : createResErrorHandler(this.loadError, 'Failed to load any profiles.'),
      });
  }

  loadMore() {
    const list = this.list();
    const cursor: Profile['id'] | undefined = list[list.length - 1]?.id;
    this.load(cursor);
  }
}
