interface Common {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface ImageBase {
  scale: number;
  info: string;
  xPos: number;
  yPos: number;
  alt: string;
}

export interface Image extends ImageBase {
  id: string;
  owner: User;
  src: string;
  size: number;
  order: number;
  width: number;
  height: number;
  ownerId: string;
  mimetype: string;
  createdAt: string;
  updatedAt: string;
}

export type NewImageData = Partial<ImageBase & { isAvatar: boolean }>;

export interface UserBase extends Common {
  bio: string;
  username: string;
  fullname: string;
  isAdmin: boolean;
  avatar?: { image: Image } | null;
}

export interface Profile {
  id: string;
  user: UserBase;
  visible: boolean;
  tangible: boolean;
  lastSeen: string;
}

export interface User extends UserBase {
  profile: Profile;
}
