import { createResErrorHandler } from '../utils';
import { finalize, Observable } from 'rxjs';
import { signal } from '@angular/core';

export abstract class ListStore<ItemType> {
  readonly list = signal<ItemType[]>([]);
  readonly loading = signal(false);
  readonly hasMore = signal(false);
  readonly loadError = signal('');

  protected abstract loadErrorMessage: string;

  protected abstract getMore(): Observable<ItemType[]>;

  reset() {
    this.hasMore.set(false);
    this.loading.set(false);
    this.loadError.set('');
    this.list.set([]);
  }

  load() {
    this.loading.set(true);
    this.loadError.set('');
    this.getMore()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (moreItems) => {
          this.hasMore.set(!!moreItems.length);
          if (this.hasMore()) this.list.update((items) => [...items, ...moreItems]);
        },
        error: createResErrorHandler(this.loadError, this.loadErrorMessage),
      });
  }
}
