import { Chat, Profile } from './chats.types';

export const sort = <T extends { createdAt: string }>(items: T[]): T[] => {
  return [...items].sort(
    (a, b) => -1 * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
  );
};

export const subtract = <T extends { id: unknown }>(items: T[], itemsToSubtract: T[]): T[] => {
  return items.filter((x) => !itemsToSubtract.some((xToSub) => xToSub.id === x.id));
};

export const findChatByAllMemberIds = (chats: Chat[], memberIds: Profile['id'][]) => {
  return chats.find((chat) =>
    chat.profiles.every((c) => c.profileId && memberIds.includes(c.profileId))
  );
};
