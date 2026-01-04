import {
  input,
  inject,
  effect,
  computed,
  Injector,
  viewChild,
  Component,
  untracked,
  OnChanges,
  ElementRef,
  SimpleChanges,
  afterNextRender,
} from '@angular/core';
import { ErrorMessage } from '../../error-message';
import { AuthData } from '../../auth/auth.types';
import { ButtonDirective } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { MessageForm } from './message-form';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { Profiles } from '../../profiles';
import { Ripple } from 'primeng/ripple';
import { Spinner } from '../../spinner';
import { Messages } from './messages';
import { Chat } from '../chats.types';

@Component({
  templateUrl: './chat-room.html',
  selector: 'app-chat-room',
  imports: [
    ButtonDirective,
    MessageModule,
    ErrorMessage,
    MessageForm,
    RouterLink,
    DatePipe,
    Spinner,
    Ripple,
  ],
  providers: [Messages],
})
export class ChatRoom implements OnChanges {
  private readonly _injector = inject(Injector);
  private readonly _profiles = inject(Profiles);

  private readonly _messagesContainer = viewChild<ElementRef<HTMLDivElement>>('messagesContainer');
  private readonly _loadMoreBtn = viewChild<ElementRef<HTMLButtonElement>>('loadMoreBtn');

  protected readonly messages = inject(Messages);

  protected readonly title = computed<{ url: string | null; label: string }>(() => {
    const profileList = this._profiles.list();
    const profileId = this.profileId();
    const chat = this.chat();
    const user = this.user();
    if (chat) {
      const memberId = chat.profiles.filter((cp) => cp.profileName !== user.username)[0].profileId;
      const url = memberId ? `/profiles/${memberId}` : null;
      const label = this.messages.chats.generateTitle(chat, user);
      return { label, url };
    } else if (profileId) {
      const profile = profileList.find((p) => p.id === profileId);
      if (profile) return { label: profile.user.username, url: `${`/profiles/${profile.id}`}` };
    }
    return { label: 'Untitled', url: null };
  });

  readonly user = input.required<AuthData['user']>();
  readonly chat = input.required<Chat | null>();
  readonly profileId = input<string>();
  readonly chatId = input<string>();

  constructor() {
    effect(() => {
      this.messages.list();
      untracked(() => {
        afterNextRender(
          () => {
            this.flushLoadMoreBtnWhenVisible();
          },
          { injector: this._injector }
        );
      });
    });
    effect(() => {
      const loadingRecentFinished = !this.messages.loadingRecent();
      if (loadingRecentFinished) this._scrollDown();
    });
  }

  private _scrollDown() {
    const messagesContainer = this._messagesContainer()?.nativeElement;
    messagesContainer?.scrollBy(0, messagesContainer.scrollHeight);
  }

  protected flushLoadMoreBtnWhenVisible() {
    const messagesContainer = this._messagesContainer()?.nativeElement;
    const loadMoreBtn = this._loadMoreBtn()?.nativeElement;
    const chatId = this.chatId();
    if (messagesContainer && loadMoreBtn && chatId) {
      const loadMoreBtnRect = loadMoreBtn.getBoundingClientRect();
      const messagesContainerRect = messagesContainer.getBoundingClientRect();
      const loadMoreBtnVisible = loadMoreBtnRect.bottom >= messagesContainerRect.top;
      if (loadMoreBtnVisible && !this.messages.loading() && !this.messages.loadError()) {
        this.messages.load(chatId);
      }
    }
  }

  protected update() {
    this._scrollDown();
    const chat = this.chat();
    if (chat) this.messages.loadRecent(chat.id, this.user().username);
  }

  ngOnChanges(changes: SimpleChanges<ChatRoom>) {
    const chat = changes.chat?.currentValue;
    if (chat) this.messages.init(chat, this.user().username);
  }
}
