import { Component, inject, input } from '@angular/core';
import { Profile as ProfileT } from '../../app.types';
import { ButtonDirective } from 'primeng/button';
import { RouterLink } from '@angular/router';
import { Ripple } from 'primeng/ripple';
import { Avatar } from 'primeng/avatar';
import { Profiles } from '../profiles';

@Component({
  selector: 'app-profile',
  imports: [RouterLink, ButtonDirective, Ripple, Avatar],
  templateUrl: './profile.html',
  styles: ``,
})
export class Profile {
  readonly profile = input.required<ProfileT>();

  readonly profiles = inject(Profiles);
}
