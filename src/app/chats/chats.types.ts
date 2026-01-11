import { Image, Profile } from '../app.types';

export interface Message {
  id: string;
  body: string;
  chatId: Chat['id'];
  profileName: string;
  profile?: Profile | null;
  profileId?: Profile['id'] | null;
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
  lastSeenAt?: string | null;
  lastReceivedAt?: string | null;
}

export interface ChatManager {
  role: 'OWNER' | 'MODERATOR';
  profileId: Profile['id'];
  chatId: Chat['id'];
  profile: Profile;
}

export interface NewMessageData {
  imagedata?: Record<string, unknown>;
  body: string;
}

export interface NewChatData {
  message: NewMessageData;
  profiles: string[];
}
