import {
  input,
  signal,
  inject,
  Component,
  OnDestroy,
  OnChanges,
  SimpleChanges,
  booleanAttribute,
} from '@angular/core';
import { User, ProfileBase } from '../app.types';
import { Image } from '../images/image';
import { Profiles } from '../profiles';
import { catchError, of } from 'rxjs';
import { Auth } from '../auth';

@Component({
  selector: 'app-avatar',
  imports: [Image],
  templateUrl: './avatar.html',
  host: { class: 'leading-0' },
})
export class Avatar implements OnChanges, OnDestroy {
  private readonly _profiles = inject(Profiles);
  private readonly _auth = inject(Auth);

  readonly size = input<'2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl'>('md');
  readonly user = input.required<Partial<Pick<User, 'username' | 'avatar'>>>();
  readonly preview = input(false, { transform: booleanAttribute });
  readonly profile = input<ProfileBase | null>();

  protected readonly online = signal(false);

  private _removeOnlineStatusListeners = () => undefined;

  private _addOnlineStatusListeners(profile: NonNullable<ReturnType<typeof this.profile>>) {
    const socket = this._auth.socket;
    if (socket) {
      const setOffline = () => this.online.set(false);
      const setOnline = () => this.online.set(true);
      const offlineEvent = `offline:${profile.id}`;
      const onlineEvent = `online:${profile.id}`;
      socket.on(offlineEvent, setOffline);
      socket.on(onlineEvent, setOnline);
      this._removeOnlineStatusListeners = () => {
        socket.removeListener(offlineEvent, setOffline);
        socket.removeListener(onlineEvent, setOnline);
      };
    }
  }

  protected getUpdatedImgSrc() {
    const image = this.user().avatar?.image;
    if (image) {
      const srcUrl = new URL(image.src, window.location.href);
      const queryPrefix = srcUrl.search && !srcUrl.search.endsWith('&') ? '&' : '';
      srcUrl.search += `${queryPrefix}updatedAt=${image.updatedAt}`;
      return srcUrl.toString();
    }
    return '';
  }

  ngOnChanges(changes: SimpleChanges<Avatar>) {
    if (changes.profile) {
      this._removeOnlineStatusListeners();
      this.online.set(false);
      const profile = changes.profile.currentValue;
      if (profile && profile.visible && !this._profiles.isCurrentProfile(profile.id)) {
        this._addOnlineStatusListeners(profile);
        this._profiles
          .isOnline(profile.id)
          .pipe(catchError(() => of(false)))
          .subscribe((online) => online === true && this.online.set(online));
      }
    }
  }

  ngOnDestroy() {
    this._removeOnlineStatusListeners();
  }
}
