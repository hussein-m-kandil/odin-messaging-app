import { input, inject, OnChanges, Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthData } from '../../auth/auth.types';
import { AvatarModule } from 'primeng/avatar';
import { BadgeModule } from 'primeng/badge';
import { Ripple } from 'primeng/ripple';
import { Chat } from '../chats.types';
import { List } from '../../list';
import { Chats } from '../chats';

@Component({
  selector: 'app-chat-list',
  imports: [RouterLinkActive, AvatarModule, BadgeModule, RouterLink, Ripple, List],
  templateUrl: './chat-list.html',
  styles: ``,
})
export class ChatList implements OnChanges {
  readonly user = input.required<AuthData['user']>();

  protected readonly chats = inject(Chats);

  protected countNewMessages(chat: Chat) {
    const { username } = this.user();
    const userLastSeenChatAt = chat.profiles.filter((cp) => cp.profileName === username)[0]
      ?.lastSeenAt;
    const otherMembersMessages = chat.messages.filter((msg) => msg.profileName !== username);
    return (
      !userLastSeenChatAt
        ? otherMembersMessages
        : otherMembersMessages.filter(
            (msg) => new Date(userLastSeenChatAt) < new Date(msg.createdAt)
          )
    ).length;
  }

  ngOnChanges() {
    this.chats.reset();
    this.chats.load();
  }
}
