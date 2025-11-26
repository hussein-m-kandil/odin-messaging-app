import { computed, signal, untracked, effect, inject, Injectable } from '@angular/core';
import { authNavOpts, getValidAuthDataOrThrowServerError } from './utils';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError, of, map, Observable, switchMap } from 'rxjs';
import { SigninData, SignupData, AuthData } from './auth.types';
import { toObservable } from '@angular/core/rxjs-interop';
import { environment } from '../../environments';
import { AppStorage } from '../app-storage';
import { Router } from '@angular/router';

const { apiUrl } = environment;

const AUTH_KEY = 'auth';

@Injectable({
  providedIn: 'root',
})
export class Auth {
  private readonly _router = inject(Router);
  private readonly _http = inject(HttpClient);
  private readonly _storage = inject(AppStorage);

  private readonly _navigating = computed(() => !!this._router.currentNavigation());

  private readonly _authData = signal<AuthData | null>(null);

  constructor() {
    let initialized = false;
    effect(() => {
      const navigating = untracked(this._navigating);
      const authData = this._authData();
      if (initialized && !navigating) {
        const redirectUrl = this._router.routerState.snapshot.root.queryParamMap?.get('url');
        const url = authData ? redirectUrl || '/' : '/signin';
        this._router.navigateByUrl(url, authNavOpts);
      } else {
        initialized = true;
      }
    });
  }

  private readonly _setAuthData = (authData: AuthData | null) => {
    this._authData.set(authData);
    if (authData) this._storage.setItem(AUTH_KEY, authData.token);
    else this._storage.removeItem(AUTH_KEY);
  };

  private readonly _saveValidAuthDataAndGetUserOrThrow = (authRes: AuthData) => {
    const authData = getValidAuthDataOrThrowServerError(authRes);
    this._setAuthData(authData);
    return authData.user;
  };

  private _verify = (): Observable<boolean> => {
    const token = this._storage.getItem(AUTH_KEY) || '';
    if (!token) return of(false);
    return this._http
      .get<AuthData['user'] | null>(`${apiUrl}/auth/me`, { headers: { Authorization: token } })
      .pipe(
        catchError((error: unknown) => {
          if (error instanceof HttpErrorResponse && error.status === 401) {
            this.signOut();
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
        })
      );
  };

  readonly user = computed<AuthData['user'] | null>(() => {
    const authData = this._authData();
    return authData ? JSON.parse(JSON.stringify(authData.user)) : null;
  });

  readonly authenticated$: Observable<boolean> = toObservable(this._authData).pipe(
    switchMap((authData) => (authData ? of(true) : this._verify()))
  );

  signIn(data: SigninData) {
    return this._http
      .post<AuthData>(`${apiUrl}/auth/signin`, data)
      .pipe(map(this._saveValidAuthDataAndGetUserOrThrow));
  }

  signUp(data: SignupData) {
    return this._http
      .post<AuthData>(`${apiUrl}/users`, data)
      .pipe(map(this._saveValidAuthDataAndGetUserOrThrow));
  }

  signOut() {
    this._setAuthData(null);
  }
}
