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
import { Profiles } from '../profiles';

@Component({
  selector: 'app-profile-list',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './profile-list.html',
  styles: ``,
})
export class ProfileList implements OnDestroy {
  private readonly _injector = inject(Injector);

  private readonly _listContainer = viewChild<ElementRef<HTMLDivElement>>('listContainer');
  private readonly _loadMoreBtn = viewChild<ElementRef<HTMLButtonElement>>('loadMoreBtn');

  protected readonly profiles = inject(Profiles);

  private readonly _flushLoadMoreBtnWhenVisible = () => {
    const listContainer = this._listContainer()?.nativeElement;
    const loadMoreBtn = this._loadMoreBtn()?.nativeElement;
    if (listContainer && loadMoreBtn) {
      const loadMoreBtnRect = loadMoreBtn.getBoundingClientRect();
      const messagesContainerRect = listContainer.getBoundingClientRect();
      const loadMoreBtnVisible = loadMoreBtnRect.top <= messagesContainerRect.bottom;
      if (loadMoreBtnVisible && this.profiles.canLoadMore() && !this.profiles.hasAnyLoadError()) {
        this.profiles.loadMore();
      }
    }
  };

  private readonly _listEffect = effect(() => {
    this.profiles.list();
    untracked(() => {
      afterNextRender(this._flushLoadMoreBtnWhenVisible, { injector: this._injector });
    });
  });

  constructor() {
    this.profiles.load();
  }

  ngOnDestroy() {
    this._listEffect.destroy();
  }
}
