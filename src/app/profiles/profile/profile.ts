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
    const profile = this.profile();
    const imageId = profile.user.avatar?.image.id;
    if (this.profiles.isCurrentProfile(profile.id)) {
      return [
        { icon: 'pi pi-pencil', routerLink: './edit', label: 'Edit profile' },
        { icon: 'pi pi-camera', routerLink: './pic', label: 'Upload picture' },
        ...(imageId
          ? [
              {
                icon: 'pi pi-trash',
                routerLink: `./pic/${imageId}/delete`,
                label: 'Delete picture',
                labelClass: 'text-(--p-button-text-danger-color)',
              },
            ]
          : []),
        {
          icon: 'pi pi-trash',
          routerLink: './delete',
          label: 'Delete profile',
          labelClass: 'text-(--p-button-text-danger-color)',
        },
      ];
    }
    return [];
  });

  readonly profile = input.required<ProfileT>();

  readonly profiles = inject(Profiles);
}
