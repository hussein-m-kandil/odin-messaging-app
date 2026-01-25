import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DestroyRef, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments';
import { ListStore } from '../list/list-store';
import { Profile } from '../app.types';
import { defer, of } from 'rxjs';
import { Auth } from '../auth';

const { apiUrl } = environment;

@Injectable({
  providedIn: 'root',
})
export class Profiles extends ListStore<Profile> {
  private readonly _destroyRef = inject(DestroyRef);
  private _http = inject(HttpClient);
  private _auth = inject(Auth);

  readonly searchValue = signal('');

  protected override loadErrorMessage = 'Failed to load any profiles.';

  readonly baseUrl = `${apiUrl}/profiles`;

  protected override getMore() {
    const profiles = this.list();
    const searchValue = this.searchValue();
    const cursor = profiles[profiles.length - 1]?.id;
    const params: Record<string, string> = {
      ...(searchValue ? { name: searchValue } : {}),
      ...(cursor ? { cursor } : {}),
    };
    return this._http
      .get<Profile[]>(this.baseUrl, { params })
      .pipe(takeUntilDestroyed(this._destroyRef));
  }

  getProfile(id: Profile['id']) {
    return defer(() => {
      const foundProfile = this.list().find((p) => p.id === id);
      if (foundProfile) return of(foundProfile);
      return this._http.get<Profile>(`${this.baseUrl}/${id}`);
    });
  }

  isCurrentProfile(id: Profile['id']) {
    const currentUser = this._auth.user();
    return !!currentUser && currentUser.profile.id === id;
  }
}
