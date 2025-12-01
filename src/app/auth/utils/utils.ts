import { NavigationBehaviorOptions, UrlSegment } from '@angular/router';
import { AuthData } from '../auth.types';

export const authNavOpts: NavigationBehaviorOptions = {
  onSameUrlNavigation: 'reload',
  replaceUrl: true,
};

export const isAuthUrl = (url: UrlSegment[] | string): boolean => {
  if (typeof url === 'string') return /^(.*\/)?sign(in|up)\/?(\?.*)?$/.test(url);
  return url.some(({ path }) => /^sign(in|up)$/.test(path));
};

export const isAuthData = (data: unknown): data is AuthData => {
  return (
    typeof data === 'object' &&
    data !== null &&
    'token' in data &&
    typeof data.token === 'string' &&
    'user' in data &&
    typeof data.user === 'object' &&
    data.user !== null &&
    'id' in data.user &&
    typeof data.user.id === 'string' &&
    'username' in data.user &&
    typeof data.user.username === 'string' &&
    'fullname' in data.user &&
    typeof data.user.fullname === 'string' &&
    'profile' in data.user &&
    typeof data.user.profile === 'object' &&
    data.user.profile !== null &&
    'id' in data.user.profile &&
    typeof data.user.profile.id === 'string'
  );
};
