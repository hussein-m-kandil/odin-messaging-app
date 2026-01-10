import { Component, computed, inject, input } from '@angular/core';
import { MenuItem, MessageService } from 'primeng/api';
import { ColorScheme, SCHEMES } from '../color-scheme';
import { ButtonDirective } from 'primeng/button';
import { environment } from '../../environments';
import { SingularView } from './singular-view';
import { AvatarModule } from 'primeng/avatar';
import { MenuModule } from 'primeng/menu';
import { Ripple } from 'primeng/ripple';
import { Auth } from '../auth';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-mainbar',
  imports: [ButtonDirective, AvatarModule, RouterLink, MenuModule, Ripple],
  templateUrl: './mainbar.html',
  styles: ``,
})
export class Mainbar {
  private readonly _toast = inject(MessageService);

  protected readonly singularView = inject(SingularView);
  protected readonly colorScheme = inject(ColorScheme);
  protected readonly auth = inject(Auth);

  protected readonly profileMenuItems = computed<MenuItem[]>(() => {
    const user = this.auth.user();
    if (!user) return [];
    return [
      {
        icon: 'pi pi-user',
        label: user.username,
        routerLink: `/profiles/${user.profile.id}`,
      },
      {
        icon: 'pi pi-sign-out',
        label: 'Sign Out',
        command: () => this.signOut(),
        labelClass: 'text-(--p-button-text-danger-color)',
      },
    ];
  });

  protected readonly colorSchemeMenuItems = computed<MenuItem[]>(() => {
    return SCHEMES.map((scheme) => ({
      icon: scheme.icon,
      label: `${scheme.value[0].toUpperCase()}${scheme.value.slice(1)}`,
      command: () => this.colorScheme.select(scheme),
    }));
  });

  readonly togglableView = input.required<boolean>();

  protected readonly title = environment.title;

  protected signOut() {
    this.auth.signOut();
    const user = this.auth.user();
    this._toast.add({
      severity: 'info',
      summary: `Bye${user ? ', ' + user.username : ''}`,
      detail: 'You have signed-out successfully.',
    });
  }
}
