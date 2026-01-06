import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DestroyRef, inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments';
import { ListStore } from '../list/list-store';
import { Profile } from '../app.types';
import { defer, of } from 'rxjs';

const { apiUrl } = environment;

@Injectable({
  providedIn: 'root',
})
export class Profiles extends ListStore<Profile> {
  private readonly _destroyRef = inject(DestroyRef);
  private _http = inject(HttpClient);

  protected override loadErrorMessage = 'Failed to load any profiles.';

  readonly baseUrl = `${apiUrl}/profiles`;

  protected override getMore() {
    const profiles = this.list();
    const cursor = profiles[profiles.length - 1]?.id;
    const options = cursor ? { params: { cursor } } : {};
    return this._http
      .get<Profile[]>(this.baseUrl, options)
      .pipe(takeUntilDestroyed(this._destroyRef));
  }

  getProfile(id: Profile['id']) {
    return defer(() => {
      const foundProfile = this.list().find((p) => p.id === id);
      if (foundProfile) return of(foundProfile);
      return this._http.get<Profile>(`${this.baseUrl}/${id}`);
    });
  }
}
