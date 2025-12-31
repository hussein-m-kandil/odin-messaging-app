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
  OnDestroy,
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
export class ChatRoom implements OnChanges, OnDestroy {
  private readonly _injector = inject(Injector);
  private readonly _profiles = inject(Profiles);

  private readonly _messagesContainer = viewChild<ElementRef<HTMLDivElement>>('messagesContainer');
  private readonly _loadMoreBtn = viewChild<ElementRef<HTMLButtonElement>>('loadMoreBtn');

  private readonly _messageListEffect = effect(() => {
    this.messages.list();
    untracked(() => {
      afterNextRender(() => this.flushLoadMoreBtnWhenVisible(), { injector: this._injector });
    });
  });

  protected readonly messages = inject(Messages);

  protected readonly title = computed<string>(() => {
    const chatList = this.messages.chats.list();
    const profileList = this._profiles.list();
    const profileId = this.profileId();
    const chatId = this.chatId();
    const user = this.user();
    if (chatId) {
      const chat = chatList.find((c) => c.id === chatId);
      if (chat) return this.messages.chats.generateTitle(chat, user);
    } else if (profileId) {
      const profile = profileList.find((p) => p.id === profileId);
      if (profile) return profile.user.username;
    }
    return 'Untitled';
  });

  readonly user = input.required<AuthData['user']>();
  readonly chat = input.required<Chat | null>();
  readonly profileId = input<string>();
  readonly chatId = input<string>();

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

  protected refresh() {
    this.messages.reset();
    const chat = this.chat();
    if (chat) this.messages.load(chat.id);
  }

  ngOnChanges(changes: SimpleChanges<ChatRoom>) {
    if (changes.chat) this.messages.init(changes.chat.currentValue);
  }

  ngOnDestroy(): void {
    this._messageListEffect.destroy();
  }
}
