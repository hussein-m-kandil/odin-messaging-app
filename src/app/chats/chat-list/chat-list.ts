import { RouterLink, RouterLinkActive } from '@angular/router';
import { inject, Component } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Ripple } from 'primeng/ripple';
import { Avatar } from '../../avatar';
import { Badge } from 'primeng/badge';
import { Chat } from '../chats.types';
import { Auth } from '../../auth';
import { List } from '../../list';
import { Chats } from '../chats';

@Component({
  selector: 'app-chat-list',
  imports: [RouterLinkActive, RouterLink, DatePipe, Avatar, Ripple, Badge, List],
  templateUrl: './chat-list.html',
  styles: ``,
})
export class ChatList {
  private _auth = inject(Auth);

  protected readonly chats = inject(Chats);

  protected countNewMessages(chat: Chat) {
    const user = this._auth.user();
    const [userLastSeenChatAt, otherMembersMessages] = user
      ? [
          chat.profiles.filter((cp) => cp.profileName === user.username)[0]?.lastSeenAt,
          chat.messages.filter((msg) => msg.profileName !== user.username),
        ]
      : [chat.profiles[0]?.lastSeenAt, chat.messages];
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

  constructor() {
    if (this.chats.list().length < 1) this.chats.load();
  }
}
