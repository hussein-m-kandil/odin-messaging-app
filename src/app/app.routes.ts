import { ProfileList } from './profiles/profile-list';
import { userResolver } from './auth/user-resolver';
import { environment } from '../environments';
import { authGuard } from './auth/auth-guard';
import { ChatRoom } from './chats/chat-room';
import { ChatList } from './chats/chat-list';
import { AuthForm } from './auth/auth-form';
import { Routes } from '@angular/router';

const { title } = environment;
const titleize = (s: string) => `${s} | ${title}`;

export const routes: Routes = [
  { path: 'signin', canActivate: [authGuard], component: AuthForm, title: titleize('Sing In') },
  { path: 'signup', canActivate: [authGuard], component: AuthForm, title: titleize('Sing Up') },
  {
    path: '',
    canActivate: [authGuard],
    resolve: { user: userResolver },
    children: [
      {
        path: 'profiles',
        children: [
          { path: '', outlet: 'nav', component: ProfileList, title: titleize('Profiles') },
          { path: ':profileId', component: ChatRoom, title: titleize('Profile') },
        ],
      },
      {
        path: 'chats',
        children: [
          { path: '', outlet: 'nav', component: ChatList, title: titleize('Chats') },
          { path: ':chatId', component: ChatRoom, title: titleize('Chat') },
        ],
      },
      { path: '**', redirectTo: 'not-found' },
    ],
  },
];
