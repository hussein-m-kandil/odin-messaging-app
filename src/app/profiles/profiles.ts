import { DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments';
import { ListStore } from '../list/list-store';
import { Profile } from '../app.types';
import { defer, map, of } from 'rxjs';
import { Auth } from '../auth';

const { apiUrl } = environment;

@Injectable({
  providedIn: 'root',
})
export class Profiles extends ListStore<Profile> {
  private readonly _destroyRef = inject(DestroyRef);
  private readonly _http = inject(HttpClient);
  private readonly _auth = inject(Auth);

  protected override loadErrorMessage = 'Failed to load any profiles.';

  readonly path = signal<'' | 'following' | 'followers'>('');
  readonly searchValue = signal('');

  readonly baseUrl = `${apiUrl}/profiles`;

  protected override getMore() {
    const path = this.path();
    const profiles = this.list();
    const searchValue = this.searchValue();
    const cursor = profiles[profiles.length - 1]?.id;
    const params: Record<string, string> = {
      ...(searchValue ? { name: searchValue } : {}),
      ...(cursor ? { cursor } : {}),
    };
    return this._http
      .get<Profile[]>(`${this.baseUrl}${path && '/' + path}`, { params })
      .pipe(takeUntilDestroyed(this._destroyRef));
  }

  override reset() {
    this.searchValue.set('');
    this.path.set('');
    super.reset();
  }

  getProfile(idOrUsername: string) {
    return defer(() => {
      const foundProfile = this.list().find(
        (p) => p.id === idOrUsername || p.user.username === idOrUsername,
      );
      if (foundProfile) return of(foundProfile);
      return this._http.get<Profile>(`${this.baseUrl}/${idOrUsername}`);
    });
  }

  toggleFollowing(profile: Profile) {
    const profileId = profile.id;
    const following = profile.followedByCurrentUser;
    const url = `${this.baseUrl}/following/${profileId}`;
    return (following ? this._http.delete<''>(url) : this._http.post<''>(url, null)).pipe(
      map((res) => {
        this.list.update((profiles) => {
          const followedByCurrentUser = !following;
          return profiles.map((p) => (p.id === profileId ? { ...p, followedByCurrentUser } : p));
        });
        return res;
      }),
    );
  }

  isCurrentProfile(id: Profile['id']) {
    const currentUser = this._auth.user();
    return !!currentUser && currentUser.profile.id === id;
  }
}
