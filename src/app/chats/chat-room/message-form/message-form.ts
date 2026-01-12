import { Component, ElementRef, inject, input, OnInit, viewChild } from '@angular/core';
import { FormGroup, FormControl, ReactiveFormsModule } from '@angular/forms';
import { createResErrorHandler } from '../../../utils';
import { TextareaModule } from 'primeng/textarea';
import { ButtonDirective } from 'primeng/button';
import { MessageService } from 'primeng/api';
import { finalize, Observable } from 'rxjs';
import { Ripple } from 'primeng/ripple';
import { Chats } from '../../chats';

@Component({
  selector: 'app-message-form',
  imports: [ReactiveFormsModule, TextareaModule, ButtonDirective, Ripple],
  templateUrl: './message-form.html',
  styles: ``,
})
export class MessageForm implements OnInit {
  private readonly _messageInput = viewChild.required<ElementRef<HTMLTextAreaElement>>('msgInp');

  private readonly _toast = inject(MessageService);
  private readonly _chats = inject(Chats);

  readonly profileId = input<string>();
  readonly chatId = input<string>();

  protected readonly form = new FormGroup({
    body: new FormControl('', { nonNullable: true }),
  });

  protected submit() {
    this.form.markAllAsDirty();
    const newMessageData = this.form.getRawValue();
    if (this.form.enabled && newMessageData.body) {
      const profileId = this.profileId();
      const chatId = this.chatId();
      let req$: Observable<unknown> | null = null;
      if (chatId) {
        req$ = this._chats.createMessage(chatId, newMessageData);
      } else if (profileId) {
        req$ = this._chats.create({ profiles: [profileId], message: newMessageData });
      }
      if (req$) {
        this.form.disable();
        req$
          .pipe(finalize(() => (this.form.enable(), this._messageInput().nativeElement.focus())))
          .subscribe({
            next: () => this.form.reset(),
            error: (error) => {
              let errorMessage = 'Failed to send your message.';
              const fakeSignal = { set: (msg: string) => (errorMessage = msg || errorMessage) };
              const handler = createResErrorHandler(fakeSignal, errorMessage);
              handler(error);
              this._toast.add({
                severity: 'error',
                summary: 'Failed message',
                detail: errorMessage,
              });
            },
          });
      }
    }
  }

  protected showScrollbarAsNeeded() {
    const msgInp = this._messageInput().nativeElement;
    const msgInpMsxHeight = parseFloat(getComputedStyle(msgInp).maxHeight);
    msgInp.style.overflow = msgInp.scrollHeight > msgInpMsxHeight ? 'auto' : '';
  }

  ngOnInit(): void {
    if (!this.chatId() && !this.profileId()) {
      const error = new Error('Missing `chatId` or `profileId` input.');
      error.name = 'MessageFormInputMissingError';
      throw error;
    }
  }
}
