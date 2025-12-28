import { Component, inject, input, OnChanges, signal, SimpleChanges } from '@angular/core';
import { Profile as ProfileT } from '../../app.types';
import { createResErrorHandler } from '../../utils';
import { ErrorMessage } from '../../error-message';
import { ButtonDirective } from 'primeng/button';
import { AuthData } from '../../auth/auth.types';
import { RouterLink } from '@angular/router';
import { Spinner } from '../../spinner';
import { Ripple } from 'primeng/ripple';
import { Avatar } from 'primeng/avatar';
import { Profiles } from '../profiles';

@Component({
  selector: 'app-profile',
  imports: [RouterLink, ErrorMessage, ButtonDirective, Spinner, Ripple, Avatar],
  templateUrl: './profile.html',
  styles: ``,
})
export class Profile implements OnChanges {
  readonly user = input.required<AuthData['user']>();
  readonly profileId = input.required<string>();

  private readonly _profiles = inject(Profiles);

  protected readonly profile = signal<ProfileT | null>(null);
  protected readonly errorMessage = signal('');

  protected load() {
    this.profile.set(null);
    this.errorMessage.set('');
    this._profiles.getProfile(this.profileId()).subscribe({
      next: (profile) => this.profile.set(profile),
      error: createResErrorHandler(this.errorMessage, 'Failed to load the profile.'),
    });
  }

  ngOnChanges(changes: SimpleChanges<Profile>) {
    if (changes.profileId) {
      this.load();
    }
  }
}
