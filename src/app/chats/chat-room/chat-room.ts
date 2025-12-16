import {
  input,
  inject,
  effect,
  Injector,
  viewChild,
  Component,
  untracked,
  OnChanges,
  OnDestroy,
  ElementRef,
  SimpleChanges,
  afterNextRender,
  computed,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthData } from '../../auth/auth.types';
import { MessageForm } from './message-form';
import { Messages } from './messages';
import { Profiles } from '../../profiles';

@Component({
  templateUrl: './chat-room.html',
  selector: 'app-chat-room',
  imports: [MessageForm],
  providers: [Messages],
})
export class ChatRoom implements OnChanges, OnDestroy {
  private readonly _route = inject(ActivatedRoute);
  private readonly _injector = inject(Injector);
  private readonly _profiles = inject(Profiles);
  private readonly _router = inject(Router);

  private readonly _messagesContainer = viewChild<ElementRef<HTMLDivElement>>('messagesContainer');
  private readonly _loadMoreBtn = viewChild<ElementRef<HTMLButtonElement>>('loadMoreBtn');

  private readonly _messageListEffect = effect(() => {
    this.messages.list();
    untracked(() => {
      afterNextRender(
        () => {
          if (!this.messages.moreLoaded()) this._scrollDownMessages();
          this.flushLoadMoreBtnWhenVisible();
        },
        { injector: this._injector }
      );
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
  readonly profileId = input<string>();
  readonly chatId = input<string>();

  private _scrollDownMessages() {
    const messagesContainer = this._messagesContainer()?.nativeElement;
    if (messagesContainer && !this.messages.loadingMore()) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }

  private _loadMessagesIfChatIdChanged(chatId?: SimpleChanges<ChatRoom>['chatId']) {
    const chatIdChanged = chatId && chatId.currentValue !== chatId.previousValue;
    if (chatIdChanged && chatId.currentValue && this.messages.canLoad()) {
      this.messages.reset();
      this.messages.load(chatId.currentValue);
    }
  }

  private _loadMessagesIfProfileIdChanged(profileId?: SimpleChanges<ChatRoom>['profileId']) {
    const chatIdChanged = profileId && profileId.currentValue !== profileId.previousValue;
    if (chatIdChanged && profileId.currentValue && this.messages.canLoad()) {
      this.messages.reset();
      this.messages.loadByMemberProfileId(profileId.currentValue, this.user().profile.id);
    }
  }

  protected flushLoadMoreBtnWhenVisible() {
    const messagesContainer = this._messagesContainer()?.nativeElement;
    const loadMoreBtn = this._loadMoreBtn()?.nativeElement;
    const chatId = this.chatId();
    if (messagesContainer && loadMoreBtn && chatId) {
      const loadMoreBtnRect = loadMoreBtn.getBoundingClientRect();
      const messagesContainerRect = messagesContainer.getBoundingClientRect();
      const loadMoreBtnVisible = loadMoreBtnRect.bottom >= messagesContainerRect.top;
      if (loadMoreBtnVisible && this.messages.canLoadMore() && !this.messages.hasAnyLoadError()) {
        this.messages.loadMore(chatId);
      }
    }
  }

  protected refresh() {
    const profileId = this.profileId();
    const chatId = this.chatId();
    if (chatId) {
      this.messages.reset();
      this.messages.load(chatId);
    } else if (profileId) {
      this.messages.reset();
      this.messages.loadByMemberProfileId(profileId, this.user().profile.id);
    }
  }

  protected goBack() {
    this._router.navigate(['..'], { relativeTo: this._route });
  }

  ngOnChanges(changes: SimpleChanges<ChatRoom>) {
    this._loadMessagesIfChatIdChanged(changes.chatId);
    this._loadMessagesIfProfileIdChanged(changes.profileId);
  }

  ngOnDestroy(): void {
    this._messageListEffect.destroy();
  }
}
