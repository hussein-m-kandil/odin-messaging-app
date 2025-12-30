import { AuthData } from '../auth/auth.types';
import { ResolveFn } from '@angular/router';
import { inject } from '@angular/core';
import { Chat } from './chats.types';
import { Chats } from './chats';

export const chatResolver: ResolveFn<Chat | null> = (route) => {
  const chats = inject(Chats);
  const { chatId, profileId } = route.params;
  if (chatId) {
    return chats.getChat(chatId);
  } else if (profileId) {
    const user = route.data['user'] as AuthData['user'] | undefined;
    if (!user) throw Error('Missing a `user`');
    return chats.getChatByMemberProfileId(profileId, user.profile.id);
  }
  throw Error('Missing `chatId` and `profileId`');
};
