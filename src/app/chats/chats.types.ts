import { Image, Profile, User } from '../app.types';

export type { Profile, User };

export interface Message {
  id: string;
  body: string;
  chatId: Chat['id'];
  profileName: string;
  profileId?: Profile['id'] | null;
  profile?: Profile | null;
  seenBy: ProfileSawMessage[];
  receivedBy: ProfileReceivedMessage[];
  imageId?: Image['id'] | null;
  image?: Image | null;
  createdAt: string;
  updatedAt: string;
}

export interface Chat {
  id: string;
  createdAt: string;
  updatedAt: string;
  messages: Message[];
  profiles: ChatProfile[];
  managers: ChatManager[];
}

export interface ChatProfile {
  profileId?: Profile['id'] | null;
  profile?: Profile | null;
  profileName: string;
  chatId: Chat['id'];
  joinedAt: string;
}

export interface ChatManager {
  role: 'OWNER' | 'MODERATOR';
  profileId: Profile['id'];
  chatId: Chat['id'];
  profile: Profile;
}

export interface ProfileSawMessage {
  profile: Profile;
  profileId: Profile['id'];
  messageId: Message['id'];
  seenAt: string;
}

export interface ProfileReceivedMessage {
  profile: Profile;
  profileId: Profile['id'];
  messageId: Message['id'];
  receivedAt: string;
}

export interface NewMessageData {
  imagedata?: Record<string, unknown>;
  body: string;
}

export interface NewChatData {
  message: NewMessageData;
  profiles: string[];
}
