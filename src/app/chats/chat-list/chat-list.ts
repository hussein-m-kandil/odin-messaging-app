import { input, inject, OnChanges, Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthData } from '../../auth/auth.types';
import { AvatarModule } from 'primeng/avatar';
import { Ripple } from 'primeng/ripple';
import { List } from '../../list';
import { Chats } from '../chats';

@Component({
  selector: 'app-chat-list',
  imports: [RouterLinkActive, AvatarModule, RouterLink, Ripple, List],
  templateUrl: './chat-list.html',
  styles: ``,
})
export class ChatList implements OnChanges {
  readonly user = input.required<AuthData['user']>();

  protected readonly chats = inject(Chats);

  ngOnChanges() {
    this.chats.reset();
    this.chats.load();
  }
}
