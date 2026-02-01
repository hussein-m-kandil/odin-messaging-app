import { Chat, NewChatData, NewMessageData } from './chats.types';
import { mergeDistinctBy } from '../utils';
import { Profile } from '../app.types';

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

export const findChatByAllMemberIds = (chats: Chat[], memberIds: Profile['id'][]) => {
  const distinctMemberIds = mergeDistinctBy(memberIds, [], (id) => id);
  return chats.find(
    (chat) =>
      chat.profiles.length === distinctMemberIds.length &&
      chat.profiles.every((c) => c.profileId && distinctMemberIds.includes(c.profileId)),
  );
};
