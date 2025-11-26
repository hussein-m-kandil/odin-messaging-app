import { User } from '../app.types';

export interface AuthData {
  token: string;
  user: User;
}

export interface SigninData {
  username: string;
  password: string;
}

export interface SignupData extends SigninData {
  fullname: string;
  confirm: string;
  bio?: string;
}
