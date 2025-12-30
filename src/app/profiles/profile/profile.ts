import { Profile as ProfileT } from '../../app.types';
import { ButtonDirective } from 'primeng/button';
import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Ripple } from 'primeng/ripple';
import { Avatar } from 'primeng/avatar';

@Component({
  selector: 'app-profile',
  imports: [RouterLink, ButtonDirective, Ripple, Avatar],
  templateUrl: './profile.html',
  styles: ``,
})
export class Profile {
  readonly profile = input.required<ProfileT>();
}
