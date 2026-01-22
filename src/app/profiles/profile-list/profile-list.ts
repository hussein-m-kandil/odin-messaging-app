import { input, inject, OnChanges, Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthData } from '../../auth/auth.types';
import { Ripple } from 'primeng/ripple';
import { Profiles } from '../profiles';
import { Avatar } from '../../avatar';
import { List } from '../../list';

@Component({
  selector: 'app-profile-list',
  imports: [RouterLinkActive, RouterLink, Avatar, Ripple, List],
  templateUrl: './profile-list.html',
  styles: ``,
})
export class ProfileList implements OnChanges {
  readonly user = input.required<AuthData['user']>();

  protected readonly profiles = inject(Profiles);

  ngOnChanges() {
    this.profiles.reset();
    this.profiles.load();
  }
}
