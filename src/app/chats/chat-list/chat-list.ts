import {
  input,
  inject,
  effect,
  Injector,
  OnChanges,
  OnDestroy,
  untracked,
  viewChild,
  Component,
  ElementRef,
  afterNextRender,
} from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthData } from '../../auth/auth.types';
import { Chats } from '../chats';

@Component({
  selector: 'app-chat-list',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './chat-list.html',
  styles: ``,
})
export class ChatList implements OnChanges, OnDestroy {
  readonly user = input.required<AuthData['user']>();

  private readonly _injector = inject(Injector);
  protected chats = inject(Chats);

  private readonly _listContainer = viewChild<ElementRef<HTMLDivElement>>('listContainer');
  private readonly _loadMoreBtn = viewChild<ElementRef<HTMLButtonElement>>('loadMoreBtn');

  private readonly _flushLoadMoreBtnWhenVisible = () => {
    const listContainer = this._listContainer()?.nativeElement;
    const loadMoreBtn = this._loadMoreBtn()?.nativeElement;
    if (listContainer && loadMoreBtn) {
      const loadMoreBtnRect = loadMoreBtn.getBoundingClientRect();
      const messagesContainerRect = listContainer.getBoundingClientRect();
      const loadMoreBtnVisible = loadMoreBtnRect.top <= messagesContainerRect.bottom;
      if (loadMoreBtnVisible && this.chats.canLoadMore() && !this.chats.hasAnyLoadError()) {
        this.chats.loadMore();
      }
    }
  };

  private readonly _listEffect = effect(() => {
    this.chats.list();
    untracked(() => {
      afterNextRender(this._flushLoadMoreBtnWhenVisible, { injector: this._injector });
    });
  });

  ngOnChanges() {
    this.chats.load();
  }

  ngOnDestroy() {
    this._listEffect.destroy();
  }
}
