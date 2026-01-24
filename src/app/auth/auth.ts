import { computed, signal, inject, Injectable, effect, untracked } from '@angular/core';
import { catchError, of, map, Observable, switchMap, defer, tap } from 'rxjs';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { SigninData, SignupData, AuthData } from './auth.types';
import { authNavOpts, isAuthData, isAuthUrl } from './utils';
import { toObservable } from '@angular/core/rxjs-interop';
import { environment } from '../../environments';
import { AppStorage } from '../app-storage';
import { Router } from '@angular/router';

const AUTH_KEY = 'auth';

const { apiUrl } = environment;

@Injectable({
  providedIn: 'root',
})
export class Auth {
  private readonly _router = inject(Router);
  private readonly _http = inject(HttpClient);
  private readonly _storage = inject(AppStorage);

  private readonly _navigating = computed(() => !!this._router.currentNavigation());

  private readonly _authData = signal<AuthData | null>(null);

  private readonly _setAuthData = (authData: AuthData | null) => {
    this._authData.set(authData);
    if (authData) this._storage.setItem(AUTH_KEY, authData.token);
    else this._storage.removeItem(AUTH_KEY);
  };

  private readonly _saveValidAuthDataAndGetUserOrThrow = (authRes: AuthData) => {
    if (!isAuthData(authRes)) {
      throw new HttpErrorResponse({ status: 500, statusText: 'malformed server response' });
    }
    this._setAuthData(authRes);
    return authRes.user;
  };

  private _verify = (): Observable<boolean> => {
    return defer(() => {
      const token = this._storage.getItem(AUTH_KEY) || '';
      if (!token) return of(false);
      return this._http
        .get<AuthData['user'] | null>(`${apiUrl}/auth/me`, { headers: { Authorization: token } })
        .pipe(
          catchError((error: unknown) => {
            if (error instanceof HttpErrorResponse && error.status === 401) {
              this._storage.removeItem(AUTH_KEY);
              return of(null);
            }
            throw error;
          }),
          map((user) => {
            if (user) {
              this._saveValidAuthDataAndGetUserOrThrow({ token, user });
              return true;
            }
            return false;
          }),
        );
    });
  };

  readonly user = computed<AuthData['user'] | null>(() => {
    const authData = this._authData();
    return authData ? JSON.parse(JSON.stringify(authData.user)) : null;
  });

  readonly token = computed<string>(() => this._authData()?.token || '');

  readonly authenticated$: Observable<boolean> = toObservable(this._authData).pipe(
    switchMap((authData) => (authData ? of(true) : this._verify())),
  );

  constructor() {
    let initialized = false;
    effect(() => {
      const navigating = untracked(this._navigating);
      const authData = this._authData();
      if (initialized && !navigating) {
        const authenticating = isAuthUrl(this._router.routerState.snapshot.url);
        const authenticated = !!authData;
        if (authenticating && authenticated) {
          const url = this._router.routerState.snapshot.root.queryParams['url'] || '/chats';
          this._router.navigateByUrl(url, authNavOpts);
        } else if (!authenticating && !authenticated) {
          this._router.navigateByUrl('/signin', authNavOpts);
        }
      } else {
        initialized = true;
      }
    });
  }

  signIn(data: SigninData) {
    return this._http
      .post<AuthData>(`${apiUrl}/auth/signin`, data)
      .pipe(map(this._saveValidAuthDataAndGetUserOrThrow));
  }

  signOut() {
    this._setAuthData(null);
  }

  signUp(data: SignupData) {
    return this._http
      .post<AuthData>(`${apiUrl}/users`, data)
      .pipe(map(this._saveValidAuthDataAndGetUserOrThrow));
  }

  edit(id: AuthData['user']['id'], data: Partial<SignupData>) {
    const reqBody: Record<string, string> = {};
    const dataEntries = Object.entries(data);
    for (const [k, v] of dataEntries) {
      if (data[k as keyof SignupData]) reqBody[k] = v;
    }
    return this._http
      .patch<AuthData>(`${apiUrl}/users/${id}`, reqBody)
      .pipe(map(this._saveValidAuthDataAndGetUserOrThrow));
  }

  delete(id: AuthData['user']['id']) {
    return this._http.delete<''>(`${apiUrl}/users/${id}`).pipe(tap(() => this.signOut()));
  }
}
