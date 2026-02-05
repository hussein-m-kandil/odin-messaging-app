import { ResolveFn } from '@angular/router';
import { inject } from '@angular/core';
import { Chat } from './chats.types';
import { Chats } from './chats';

export const chatResolver: ResolveFn<Chat | null> = (route) => {
  const chats = inject(Chats);
  const { chatId, profileId } = route.params;
  if (chatId) return chats.getChat(chatId);
  else if (profileId) return chats.getChatByMember(profileId);
  throw Error('Missing `chatId` and `profileId`');
};
