import { profileResolver } from './profiles/profile-resolver';
import { ProfileList } from './profiles/profile-list';
import { chatResolver } from './chats/chat-resolver';
import { userResolver } from './auth/user-resolver';
import { environment } from '../environments';
import { authGuard } from './auth/auth-guard';
import { ChatRoom } from './chats/chat-room';
import { ChatList } from './chats/chat-list';
import { Profile } from './profiles/profile';
import { AuthForm } from './auth/auth-form';
import { Route, Routes } from '@angular/router';
import { NotFound } from './not-found';

const { title } = environment;
const titleize = (s: string) => `${s} | ${title}`;

const chatRoute: Route = {
  path: ':chatId',
  component: ChatRoom,
  title: titleize('Chat'),
  resolve: { chat: chatResolver },
};

const profileRoute = {
  path: ':profileId',
  component: Profile,
  title: titleize('Profile'),
  resolve: { profile: profileResolver },
};

export const routes: Routes = [
  { path: 'not-found', component: NotFound, title: titleize('Not Found') },
  { path: 'signin', canActivate: [authGuard], component: AuthForm, title: titleize('Sing In') },
  { path: 'signup', canActivate: [authGuard], component: AuthForm, title: titleize('Sing Up') },
  {
    path: '',
    canActivate: [authGuard],
    resolve: { user: userResolver },
    children: [
      {
        path: '',
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'chats' },
          {
            path: 'chats',
            children: [
              { path: '', outlet: 'mainMenu', component: ChatList, title: titleize('Chats') },
              { ...chatRoute, path: ':chatId' },
            ],
          },
          {
            path: 'profiles',
            children: [
              { path: '', outlet: 'mainMenu', component: ProfileList, title: titleize('Profiles') },
              { ...chatRoute, path: ':profileId/chat' },
              { ...profileRoute, path: ':profileId' },
            ],
          },
        ],
      },
    ],
  },
  { path: '**', redirectTo: 'not-found' },
];
