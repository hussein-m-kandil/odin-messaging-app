import { Routes, TitleStrategy, RouterStateSnapshot, ResolveFn } from '@angular/router';
import { profileResolver } from './profiles/profile-resolver';
import { chatResolver } from './chats/chat-resolver';
import { userResolver } from './auth/user-resolver';
import { inject, Injectable } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { environment } from '../environments';
import { authGuard } from './auth/auth-guard';

@Injectable({ providedIn: 'root' })
export class RouteTitleStrategy extends TitleStrategy {
  private readonly _title = inject(Title);
  override updateTitle(snapshot: RouterStateSnapshot): void {
    let routeTitle = this.buildTitle(snapshot);
    if (!routeTitle) {
      // Note: The title of a named outlet is never used; angular.dev/api/router/TitleStrategy
      if (snapshot.url === '/chats') routeTitle = 'Chats';
      if (snapshot.url === '/profiles') routeTitle = 'Profiles';
    }
    this._title.setTitle((routeTitle ? routeTitle + ' | ' : '') + environment.title);
  }
}

const loadProfileList = async () => (await import('./profiles/profile-list')).ProfileList;
const loadDeleteImage = async () => (await import('./images/delete-image')).DeleteImage;
const loadDeleteForm = async () => (await import('./auth/delete-form')).DeleteForm;
const loadImageForm = async () => (await import('./images/image-form')).ImageForm;
const loadChatList = async () => (await import('./chats/chat-list')).ChatList;
const loadChatRoom = async () => (await import('./chats/chat-room')).ChatRoom;
const loadAuthForm = async () => (await import('./auth/auth-form')).AuthForm;
const loadProfile = async () => (await import('./profiles/profile')).Profile;
const loadNotFound = async () => (await import('./not-found')).NotFound;

export const routes: Routes = [
  { path: 'signin', canActivate: [authGuard], title: 'Sing In', loadComponent: loadAuthForm },
  { path: 'signup', canActivate: [authGuard], title: 'Sing Up', loadComponent: loadAuthForm },
  {
    path: '',
    canActivate: [authGuard],
    resolve: { user: userResolver },
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'chats' },
      { path: 'not-found', title: 'Not Found', loadComponent: loadNotFound },
      {
        path: 'chats',
        children: [
          { path: '', outlet: 'mainMenu', title: 'Chats', loadComponent: loadChatList },
          {
            path: ':chatId',
            title: 'Chat',
            resolve: { chat: chatResolver },
            loadComponent: loadChatRoom,
          },
        ],
      },
      {
        path: 'followers',
        children: [
          { path: '', title: 'Followers', outlet: 'mainMenu', loadComponent: loadProfileList },
        ],
      },
      {
        path: 'following',
        children: [
          { path: '', title: 'Following', outlet: 'mainMenu', loadComponent: loadProfileList },
        ],
      },
      {
        path: 'profiles',
        children: [
          { path: '', title: 'Profiles', outlet: 'mainMenu', loadComponent: loadProfileList },
          {
            path: ':profileId/chat',
            title: 'Chat',
            resolve: { chat: chatResolver, profile: profileResolver },
            loadComponent: loadChatRoom,
          },
          {
            path: ':profileId/edit',
            title: 'Update Profile',
            resolve: { profile: profileResolver },
            loadComponent: loadAuthForm,
          },
          {
            path: ':profileId/delete',
            title: 'Delete Profile',
            resolve: {
              redirectUrl: ((_, state) =>
                state.url.split('/').slice(0, -1).join('/')) as ResolveFn<string>,
            },
            loadComponent: loadDeleteForm,
          },
          {
            path: ':profileId/pic',
            title: 'Upload Profile Picture',
            resolve: { isAvatar: () => true },
            loadComponent: loadImageForm,
          },
          {
            path: ':profileId/pic/:imageId/delete',
            title: 'Delete Profile Picture',
            resolve: {
              isAvatar: () => true,
              redirectUrl: ((_, state) =>
                state.url.split('/').slice(0, -3).join('/')) as ResolveFn<string>,
            },
            loadComponent: loadDeleteImage,
          },
          {
            path: ':profileId',
            title: 'Profile',
            runGuardsAndResolvers: 'always',
            resolve: { profile: profileResolver },
            loadComponent: loadProfile,
          },
        ],
      },
    ],
  },
  { path: '**', redirectTo: 'not-found' },
];
