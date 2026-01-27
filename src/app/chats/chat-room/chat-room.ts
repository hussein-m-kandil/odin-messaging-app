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
import { ListLoader } from '../../list/list-loader';
import { ErrorMessage } from '../../error-message';
import { AuthData } from '../../auth/auth.types';
import { ButtonDirective } from 'primeng/button';
import { MessageModule } from 'primeng/message';
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
    MessageModule,
    ErrorMessage,
    MessageForm,
    RouterLink,
    ListLoader,
    DatePipe,
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
    const profile = this.profile();
    const chat = this.chat();
    const user = this.user();
    if (chat) {
      const memberId = this.messages.chats.getOtherProfiles(chat, user)[0]?.profileId;
      return {
        label: this.messages.chats.generateTitle(chat, user),
        url: memberId ? `/profiles/${memberId}` : null,
      };
    } else if (profile) {
      return { label: profile.user.username, url: `${`/profiles/${profile.id}`}` };
    }
    return { label: 'Untitled', url: null };
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
    const chat = changes.chat?.currentValue;
    if (chat) this.messages.init(chat);
  }

  ngOnDestroy() {
    this.messages.reset();
  }
}
