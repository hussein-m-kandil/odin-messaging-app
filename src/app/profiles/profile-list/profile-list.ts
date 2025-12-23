import {
  effect,
  inject,
  Injector,
  viewChild,
  untracked,
  OnDestroy,
  Component,
  ElementRef,
  afterNextRender,
} from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ErrorMessage } from '../../error-message';
import { ButtonDirective } from 'primeng/button';
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
export class ProfileList implements OnDestroy {
  private readonly _injector = inject(Injector);

  private readonly _loadMoreBtn = viewChild<ElementRef<HTMLButtonElement>>('loadMoreBtn');

  private readonly _listEffect = effect(() => {
    this.profiles.list();
    untracked(() => {
      afterNextRender(this.flushLoadMoreBtnWhenVisible, { injector: this._injector });
    });
  });

  protected readonly profiles = inject(Profiles);

  constructor() {
    this.profiles.load();
  }

  protected flushLoadMoreBtnWhenVisible = () => {
    const loadMoreBtn = this._loadMoreBtn()?.nativeElement;
    if (loadMoreBtn) {
      const loadMoreBtnRect = loadMoreBtn.getBoundingClientRect();
      const loadMoreBtnVisible = loadMoreBtnRect.top <= window.innerHeight;
      if (loadMoreBtnVisible && this.profiles.canLoadMore() && !this.profiles.hasAnyLoadError()) {
        this.profiles.loadMore();
      }
    }
  };

  ngOnDestroy() {
    this._listEffect.destroy();
  }
}
