import { environment } from '../environments';
import { authGuard } from './auth/auth-guard';
import { AuthForm } from './auth/auth-form';
import { Routes } from '@angular/router';

import { Component } from '@angular/core';

const { title } = environment;
const titleize = (s: string) => `${s} | ${title}`;

@Component({ template: '<h1 class="text-center my-4 italic">Temporary Home Page</h1>' })
class TEMP_HOME {}

export const routes: Routes = [
  { path: '', component: TEMP_HOME, canActivate: [authGuard] },
  {
    path: '',
    canActivateChild: [authGuard],
    children: [
      { path: 'signin', component: AuthForm, title: titleize('Sing In') },
      { path: 'signup', component: AuthForm, title: titleize('Sing Up') },
    ],
  },
];
