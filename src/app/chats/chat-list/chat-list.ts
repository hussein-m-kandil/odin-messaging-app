import {
  input,
  inject,
  effect,
  Injector,
  OnChanges,
  untracked,
  viewChild,
  Component,
  ElementRef,
  afterNextRender,
} from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ErrorMessage } from '../../error-message';
import { AuthData } from '../../auth/auth.types';
import { ButtonDirective } from 'primeng/button';
import { AvatarModule } from 'primeng/avatar';
import { MenuModule } from 'primeng/menu';
import { Spinner } from '../../spinner';
import { Ripple } from 'primeng/ripple';
import { Chats } from '../chats';

@Component({
  selector: 'app-chat-list',
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
  templateUrl: './chat-list.html',
  styles: ``,
})
export class ChatList implements OnChanges {
  private readonly _loadMoreBtn = viewChild<ElementRef<HTMLButtonElement>>('loadMoreBtn');
  private readonly _injector = inject(Injector);

  readonly user = input.required<AuthData['user']>();

  protected readonly chats = inject(Chats);

  constructor() {
    effect(() => {
      this.chats.list();
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
      if (loadMoreBtnVisible) this.chats.load();
    }
  }

  ngOnChanges() {
    this.chats.reset();
    this.chats.load();
  }
}
