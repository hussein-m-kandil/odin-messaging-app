import { Component, computed, inject, input } from '@angular/core';
import { Profile as ProfileT } from '../../app.types';
import { ButtonDirective } from 'primeng/button';
import { RouterLink } from '@angular/router';
import { Ripple } from 'primeng/ripple';
import { Profiles } from '../profiles';
import { MenuItem } from 'primeng/api';
import { Avatar } from '../../avatar';
import { Menu } from 'primeng/menu';

@Component({
  selector: 'app-profile',
  imports: [RouterLink, ButtonDirective, Avatar, Ripple, Menu],
  templateUrl: './profile.html',
  styles: ``,
})
export class Profile {
  protected readonly optionsMenuItems = computed<MenuItem[]>(() => {
    if (this.profiles.isCurrentProfile(this.profile().id)) {
      return [
        { icon: 'pi pi-camera', routerLink: './pic', label: 'Upload picture' },
        { icon: 'pi pi-pencil', routerLink: './edit', label: 'Edit data' },
      ];
    }
    return [];
  });

  readonly profile = input.required<ProfileT>();

  readonly profiles = inject(Profiles);
}
