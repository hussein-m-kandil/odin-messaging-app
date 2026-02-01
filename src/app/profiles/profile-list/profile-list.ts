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
  private _activeRoute = inject(ActivatedRoute);
  private _router = inject(Router);

  protected readonly profiles = inject(Profiles);

  readonly name = input('', { transform: (v?: string) => v || '' });
  readonly user = input.required<AuthData['user']>();

  protected search(name: string) {
    this._router.navigate(['.'], {
      relativeTo: this._activeRoute,
      queryParams: name ? { name } : {},
    });
  }

  ngOnChanges(changes: SimpleChanges<ProfileList>) {
    this.profiles.reset();
    const checkUrl = (path: string) => this._router.url.startsWith(path);
    switch (true) {
      case checkUrl('/followers'):
        this.profiles.path.set('followers');
        break;
      case checkUrl('/following'):
        this.profiles.path.set('following');
        break;
      default:
        this.profiles.path.set('');
    }
    if (changes.name) this.profiles.searchValue.set(changes.name.currentValue || '');
    if (this.profiles.list().length < 1 && !this.profiles.loading()) this.profiles.load();
  }
}
