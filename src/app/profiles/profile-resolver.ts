import { ResolveFn } from '@angular/router';
import { inject } from '@angular/core';
import { Profile } from '../app.types';
import { Profiles } from './profiles';

export const profileResolver: ResolveFn<Profile> = (route) => {
  const profiles = inject(Profiles);
  const profileId = route.params['profileId'];
  if (!profileId) throw Error('Missing a profile id!');
  return profiles.getProfile(profileId);
};
