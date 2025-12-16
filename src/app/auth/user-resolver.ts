import { ResolveFn } from '@angular/router';
import { AuthData } from './auth.types';
import { inject } from '@angular/core';
import { Auth } from './auth';

export const userResolver: ResolveFn<AuthData['user']> = () => {
  const auth = inject(Auth);
  const user = auth.user();
  if (!user) {
    auth.signOut();
    throw new Error('Unauthorized navigation');
  }
  return user;
};
