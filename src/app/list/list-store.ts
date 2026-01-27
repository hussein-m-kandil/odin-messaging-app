import { finalize, Observable, Subscription } from 'rxjs';
import { createResErrorHandler } from '../utils';
import { computed, linkedSignal, signal } from '@angular/core';

export abstract class ListStore<ItemType> {
  readonly list = signal<ItemType[]>([]);
  readonly hasMore = signal(false);

  readonly loadingSubscription = signal<Subscription | null>(null);

  readonly loading = computed<boolean>(() => !!this.loadingSubscription());

  readonly loadError = linkedSignal<boolean, string>({
    source: this.loading,
    computation: (source, previous) => (source ? '' : previous?.value || ''),
  });

  protected abstract loadErrorMessage: string;

  protected abstract getMore(): Observable<ItemType[]>;

  protected updateList(items: ItemType[]) {
    if (items.length) this.list.update((listItems) => [...listItems, ...items]);
  }

  protected finalizeLoad() {
    this.loadingSubscription.update((loadSub) => (loadSub?.unsubscribe(), null));
  }

  reset() {
    this.finalizeLoad();
    this.loadError.set('');
    this.list.set([]);
    this.hasMore.set(false);
  }

  load() {
    this.loadingSubscription.update((loadSub) => {
      loadSub?.unsubscribe();
      return this.getMore()
        .pipe(finalize(() => this.finalizeLoad()))
        .subscribe({
          next: (items) => {
            this.updateList(items);
            this.hasMore.set(!!items.length);
          },
          error: createResErrorHandler(this.loadError, this.loadErrorMessage),
        });
    });
  }
}
