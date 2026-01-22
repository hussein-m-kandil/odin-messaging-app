import { Profile } from '../app.types';
import { Chat, NewChatData, NewMessageData } from './chats.types';

export const createMessageFormData = (data: NewMessageData, chatFormData?: FormData) => {
  const prefixKey = (k: string) => (chatFormData ? `message[${k}]` : k);
  const formData = chatFormData || new FormData();
  if (data.image) formData.set('image', data.image);
  formData.set(prefixKey('body'), data.body || '');
  if (data.imagedata) {
    Object.entries(data.imagedata).forEach(([k, v]) =>
      formData.set(`${prefixKey('imagedata')}[${k}]`, String(v)),
    );
  }
  return formData;
};

export const createChatFormData = (data: NewChatData) => {
  const formData = new FormData();
  const profiles = data.profiles || [];
  profiles.forEach((profileId, i) => formData.set(`profiles[${i}]`, profileId));
  return createMessageFormData(data.message || {}, formData);
};

export const subtract = <T extends { id: unknown }>(items: T[], itemsToSubtract: T[]): T[] => {
  return items.filter((x) => !itemsToSubtract.some((xToSub) => xToSub.id === x.id));
};

export const findChatByAllMemberIds = (chats: Chat[], memberIds: Profile['id'][]) => {
  return chats.find((chat) =>
    chat.profiles.every((c) => c.profileId && memberIds.includes(c.profileId)),
  );
};
