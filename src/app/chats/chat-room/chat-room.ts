import {
  input,
  inject,
  effect,
  computed,
  viewChild,
  Component,
  OnChanges,
  OnDestroy,
  ElementRef,
  SimpleChanges,
} from '@angular/core';
import { Message as PMessage } from 'primeng/message';
import { ListLoader } from '../../list/list-loader';
import { ErrorMessage } from '../../error-message';
import { AuthData } from '../../auth/auth.types';
import { ButtonDirective } from 'primeng/button';
import { MessageForm } from './message-form';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { Image } from '../../images/image';
import { Profile } from '../../app.types';
import { Ripple } from 'primeng/ripple';
import { Spinner } from '../../spinner';
import { Messages } from './messages';
import { Chat } from '../chats.types';

@Component({
  templateUrl: './chat-room.html',
  selector: 'app-chat-room',
  imports: [
    ButtonDirective,
    ErrorMessage,
    MessageForm,
    RouterLink,
    ListLoader,
    DatePipe,
    PMessage,
    Spinner,
    Ripple,
    Image,
  ],
  providers: [Messages],
})
export class ChatRoom implements OnChanges, OnDestroy {
  private readonly _messagesContainer = viewChild<ElementRef<HTMLDivElement>>('messagesContainer');

  protected readonly messages = inject(Messages);

  protected readonly title = computed<{ url: string | null; label: string }>(() => {
    const createProfileUrl = (profile?: Profile | null) => {
      return profile ? `/profiles/${profile.user.username}` : null;
    };
    const profile = this.profile();
    const chat = this.chat();
    const user = this.user();
    if (chat) {
      return {
        url: createProfileUrl(this.messages.chats.getOtherProfiles(chat, user)[0]?.profile),
        label: this.messages.chats.generateTitle(chat, user),
      };
    }
    return { url: createProfileUrl(profile), label: profile?.user.username || 'Untitled' };
  });

  readonly user = input.required<AuthData['user']>();
  readonly chat = input.required<Chat | null>();
  readonly profile = input<Profile | null>();
  readonly profileId = input<string>();
  readonly chatId = input<string>();

  constructor() {
    effect(() => {
      const loadingRecentFinished = !this.messages.loadingRecent();
      if (loadingRecentFinished) this._scrollDown();
    });
  }

  private _scrollDown() {
    const messagesContainer = this._messagesContainer()?.nativeElement;
    messagesContainer?.scrollBy(0, messagesContainer.scrollHeight);
  }

  protected update() {
    this._scrollDown();
    const chat = this.chat();
    if (chat) this.messages.loadRecent(chat.id, this.user().username);
  }

  ngOnChanges(changes: SimpleChanges<ChatRoom>) {
    if (changes.chat) {
      if (changes.chat.currentValue) this.messages.init(changes.chat.currentValue);
      else this.messages.reset();
    }
  }

  ngOnDestroy() {
    this.messages.reset();
  }
}
