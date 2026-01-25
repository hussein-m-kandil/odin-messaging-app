import { Routes, TitleStrategy, RouterStateSnapshot, ResolveFn } from '@angular/router';
import { profileResolver } from './profiles/profile-resolver';
import { ProfileList } from './profiles/profile-list';
import { chatResolver } from './chats/chat-resolver';
import { userResolver } from './auth/user-resolver';
import { inject, Injectable } from '@angular/core';
import { ImageForm, DeleteImage } from './images';
import { Title } from '@angular/platform-browser';
import { AuthForm, DeleteForm } from './auth';
import { environment } from '../environments';
import { authGuard } from './auth/auth-guard';
import { ChatRoom } from './chats/chat-room';
import { ChatList } from './chats/chat-list';
import { Profile } from './profiles/profile';
import { NotFound } from './not-found';

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

export const routes: Routes = [
  { path: 'signin', canActivate: [authGuard], component: AuthForm, title: 'Sing In' },
  { path: 'signup', canActivate: [authGuard], component: AuthForm, title: 'Sing Up' },
  {
    path: '',
    canActivate: [authGuard],
    resolve: { user: userResolver },
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'chats' },
      { path: 'not-found', component: NotFound, title: 'Not Found' },
      {
        path: 'chats',
        children: [
          { path: '', outlet: 'mainMenu', component: ChatList, title: 'Chats' },
          {
            path: ':chatId',
            component: ChatRoom,
            title: 'Chat',
            resolve: { chat: chatResolver },
          },
        ],
      },
      {
        path: 'profiles',
        children: [
          { path: '', outlet: 'mainMenu', component: ProfileList, title: 'Profiles' },
          {
            path: ':profileId/chat',
            component: ChatRoom,
            title: 'Chat',
            resolve: { chat: chatResolver, profile: profileResolver },
          },
          {
            path: ':profileId/edit',
            component: AuthForm,
            title: 'Update Profile',
            resolve: { profile: profileResolver },
          },
          {
            path: ':profileId/delete',
            component: DeleteForm,
            title: 'Delete Profile',
          },
          {
            path: ':profileId/pic',
            component: ImageForm,
            title: 'Upload Profile Picture',
            resolve: { isAvatar: () => true },
          },
          {
            path: ':profileId/pic/:imageId/delete',
            component: DeleteImage,
            title: 'Delete Profile Picture',
            resolve: {
              isAvatar: () => true,
              redirectUrl: ((_, state) =>
                state.url.split('/').slice(0, -3).join('/')) as ResolveFn<string>,
            },
          },
          {
            path: ':profileId',
            component: Profile,
            title: 'Profile',
            resolve: { profile: profileResolver },
          },
        ],
      },
    ],
  },
  { path: '**', redirectTo: 'not-found' },
];
