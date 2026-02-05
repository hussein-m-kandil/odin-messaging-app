import { Component, computed, inject, input, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MenuItem, MessageService } from 'primeng/api';
import { Profile as ProfileT } from '../../app.types';
import { Button } from 'primeng/button';
import { Profiles } from '../profiles';
import { Avatar } from '../../avatar';
import { Menu } from 'primeng/menu';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-profile',
  imports: [Button, Avatar, Menu],
  templateUrl: './profile.html',
  styles: ``,
})
export class Profile {
  private readonly _activeRoute = inject(ActivatedRoute);
  private readonly _toast = inject(MessageService);
  private readonly _router = inject(Router);

  protected readonly optionsMenuItems = computed<MenuItem[]>(() => {
    const profile = this.profile();
    const imageId = profile.user.avatar?.image.id;
    if (!this.loading() && this.profiles.isCurrentProfile(profile.id)) {
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

  protected readonly loading = signal(false);

  readonly profile = input.required<ProfileT>();

  readonly profiles = inject(Profiles);

  protected toggleFollowing() {
    const profile = this.profile();
    if (!this.loading() && !this.profiles.isCurrentProfile(profile.id)) {
      this.loading.set(true);
      this.profiles
        .toggleFollowing(profile)
        .pipe(finalize(() => this.loading.set(false)))
        .subscribe({
          next: () => {
            this._router.navigate(['.'], {
              relativeTo: this._activeRoute,
              onSameUrlNavigation: 'reload',
              replaceUrl: true,
            });
          },
          error: () => {
            const action = profile.followedByCurrentUser ? 'Unfollow' : 'Follow';
            this._toast.add({
              severity: 'error',
              summary: `${action} Failed`,
              detail: `Failed to ${action.toLowerCase()} this profile.`,
            });
          },
        });
    }
  }

  protected chat() {
    if (!this.loading()) this._router.navigate(['chat'], { relativeTo: this._activeRoute });
  }

  protected goBack() {
    if (!this.loading()) this._router.navigate(['..'], { relativeTo: this._activeRoute });
  }
}
