import { DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments';
import { createResErrorHandler } from '../utils';
import { defer, finalize, of } from 'rxjs';
import { Profile } from '../app.types';

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
  readonly hasMore = signal(false);

  readonly baseUrl = `${apiUrl}/profiles`;

  reset() {
    this.hasMore.set(false);
    this.loading.set(false);
    this.loadError.set('');
    this.list.set([]);
  }

  load() {
    this.loading.set(true);
    this.loadError.set('');
    const list = this.list();
    const cursor = list[list.length - 1]?.id;
    const options = cursor ? { params: { cursor } } : {};
    this._http
      .get<Profile[]>(this.baseUrl, options)
      .pipe(
        takeUntilDestroyed(this._destroyRef),
        finalize(() => this.loading.set(false))
      )
      .subscribe({
        next: (olderList) => {
          this.hasMore.set(!!olderList.length);
          if (this.hasMore()) this.list.update((list) => [...list, ...olderList]);
        },
        error: createResErrorHandler(this.loadError, 'Failed to load any profiles.'),
      });
  }

  getProfile(id: Profile['id']) {
    return defer(() => {
      const foundProfile = this.list().find((p) => p.id === id);
      if (foundProfile) return of(foundProfile);
      return this._http.get<Profile>(`${this.baseUrl}/${id}`);
    });
  }
}
