import {
  input,
  effect,
  inject,
  Injector,
  viewChild,
  untracked,
  OnChanges,
  Component,
  ElementRef,
  afterNextRender,
} from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ErrorMessage } from '../../error-message';
import { ButtonDirective } from 'primeng/button';
import { AuthData } from '../../auth/auth.types';
import { AvatarModule } from 'primeng/avatar';
import { MenuModule } from 'primeng/menu';
import { Spinner } from '../../spinner';
import { Ripple } from 'primeng/ripple';
import { Profiles } from '../profiles';

@Component({
  selector: 'app-profile-list',
  imports: [
    RouterLinkActive,
    ButtonDirective,
    ErrorMessage,
    AvatarModule,
    RouterLink,
    MenuModule,
    Spinner,
    Ripple,
  ],
  templateUrl: './profile-list.html',
  styles: ``,
})
export class ProfileList implements OnChanges {
  private readonly _loadMoreBtn = viewChild<ElementRef<HTMLButtonElement>>('loadMoreBtn');
  private readonly _injector = inject(Injector);

  readonly user = input.required<AuthData['user']>();

  protected readonly profiles = inject(Profiles);

  constructor() {
    effect(() => {
      this.profiles.list();
      untracked(() => {
        afterNextRender(() => this.flushLoadMoreBtnWhenVisible(), { injector: this._injector });
      });
    });
  }

  protected flushLoadMoreBtnWhenVisible() {
    const loadMoreBtn = this._loadMoreBtn()?.nativeElement;
    if (loadMoreBtn) {
      const loadMoreBtnRect = loadMoreBtn.getBoundingClientRect();
      const loadMoreBtnVisible = loadMoreBtnRect.top <= window.innerHeight;
      if (loadMoreBtnVisible) this.profiles.load();
    }
  }

  ngOnChanges() {
    this.profiles.reset();
    this.profiles.load();
  }
}
