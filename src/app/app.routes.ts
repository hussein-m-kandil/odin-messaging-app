import { ProfileList } from './profiles/profile-list';
import { userResolver } from './auth/user-resolver';
import { environment } from '../environments';
import { authGuard } from './auth/auth-guard';
import { ChatRoom } from './chats/chat-room';
import { ChatList } from './chats/chat-list';
import { Profile } from './profiles/profile';
import { AuthForm } from './auth/auth-form';
import { Routes } from '@angular/router';
import { NotFound } from './not-found';

const { title } = environment;
const titleize = (s: string) => `${s} | ${title}`;

export const routes: Routes = [
  { path: 'signin', canActivate: [authGuard], component: AuthForm, title: titleize('Sing In') },
  { path: 'signup', canActivate: [authGuard], component: AuthForm, title: titleize('Sing Up') },
  {
    path: '',
    canActivate: [authGuard],
    children: [
      { path: 'not-found', component: NotFound, title: titleize('Not Found') },
      {
        path: '',
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'chats' },
          {
            path: 'chats',
            resolve: { user: userResolver },
            children: [
              { path: '', outlet: 'mainMenu', component: ChatList, title: titleize('Chats') },
              { path: ':chatId', component: ChatRoom, title: titleize('Chat') },
            ],
          },
          {
            path: 'profiles',
            resolve: { user: userResolver },
            children: [
              { path: '', outlet: 'mainMenu', component: ProfileList, title: titleize('Profiles') },
              { path: ':profileId/chat', component: ChatRoom, title: titleize('Chat') },
              { path: ':profileId', component: Profile, title: titleize('Profile') },
            ],
          },
        ],
      },
      { path: '**', redirectTo: 'not-found' },
    ],
  },
];
