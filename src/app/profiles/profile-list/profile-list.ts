import { ActivatedRoute, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { input, inject, OnChanges, Component, SimpleChanges } from '@angular/core';
import { AuthData } from '../../auth/auth.types';
import { Ripple } from 'primeng/ripple';
import { Profiles } from '../profiles';
import { Avatar } from '../../avatar';
import { List } from '../../list';

@Component({
  selector: 'app-profile-list',
  imports: [RouterLinkActive, RouterLink, Ripple, Avatar, List],
  templateUrl: './profile-list.html',
  styles: ``,
})
export class ProfileList implements OnChanges {
  private _route = inject(ActivatedRoute);
  private _router = inject(Router);

  protected readonly profiles = inject(Profiles);

  readonly name = input('', { transform: (v?: string) => v || '' });
  readonly user = input.required<AuthData['user']>();

  protected search(name: string) {
    this._router.navigate(['.'], { relativeTo: this._route, queryParams: name ? { name } : {} });
  }

  ngOnChanges(changes: SimpleChanges<ProfileList>) {
    this.profiles.reset();
    this.profiles.searchValue.set(changes.name?.currentValue || '');
    this.profiles.load();
  }
}
