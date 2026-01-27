import { input, inject, OnChanges, Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthData } from '../../auth/auth.types';
import { DatePipe } from '@angular/common';
import { Ripple } from 'primeng/ripple';
import { Avatar } from '../../avatar';
import { Badge } from 'primeng/badge';
import { Chat } from '../chats.types';
import { List } from '../../list';
import { Chats } from '../chats';

@Component({
  selector: 'app-chat-list',
  imports: [RouterLinkActive, RouterLink, DatePipe, Avatar, Ripple, Badge, List],
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
            (msg) => new Date(userLastSeenChatAt) < new Date(msg.createdAt),
          )
    ).length;
  }

  protected getDistanceDays(date: Date | string) {
    const dayMS = 24 * 60 * 60 * 1000;
    const nowMS = new Date().getTime();
    const dateMS = new Date(date).getTime();
    return Math.floor((nowMS - dateMS) / dayMS);
  }

  ngOnChanges() {
    if (this.chats.list().length < 1) this.chats.load();
    else this.chats.updateChats();
  }
}
