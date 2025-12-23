import { FormGroup, FormControl, ValueChangeEvent, ReactiveFormsModule } from '@angular/forms';
import { Component, ElementRef, inject, input, OnInit, signal, viewChild } from '@angular/core';
import { filter, finalize, Observable, take, takeLast, tap } from 'rxjs';
import { ButtonDirective, ButtonIcon } from 'primeng/button';
import { createResErrorHandler } from '../../../utils';
import { TextareaModule } from 'primeng/textarea';
import { Ripple } from 'primeng/ripple';
import { Messages } from '../messages';
import { Chats } from '../../chats';

@Component({
  selector: 'app-message-form',
  imports: [ReactiveFormsModule, TextareaModule, ButtonDirective, ButtonIcon, Ripple],
  templateUrl: './message-form.html',
  styles: ``,
})
export class MessageForm implements OnInit {
  private readonly _msgBodyInp = viewChild.required<ElementRef<HTMLTextAreaElement>>('msgBody');

  private readonly _chats = inject(Chats);
  private readonly _messages = inject(Messages);

  readonly profileId = input<string>();
  readonly chatId = input<string>();

  protected readonly errorMessage = signal('');

  protected readonly form = new FormGroup({
    body: new FormControl('', { nonNullable: true }),
  });

  private readonly _resetErrMsgOnChange = () => {
    /* 
      Reset the error message after the first user change,
      while ignoring the change event triggered by re-enabling the form.
    */
    const isChangeEvent = (e: unknown) => e instanceof ValueChangeEvent;
    this.form.events
      .pipe(filter(isChangeEvent), take(2), takeLast(1))
      .subscribe(() => this.errorMessage.set(''));
  };

  protected submit() {
    this.errorMessage.set('');
    this.form.markAllAsDirty();
    const newMessageData = this.form.getRawValue();
    if (this.form.enabled && newMessageData.body) {
      const profileId = this.profileId();
      const chatId = this.chatId();
      let req$: Observable<unknown> | null = null;
      if (chatId) {
        req$ = this._messages.create(chatId, newMessageData);
      } else if (profileId) {
        req$ = this._chats.create({ profiles: [profileId], message: newMessageData });
      }
      if (req$) {
        this.form.disable();
        req$
          .pipe(
            tap({ error: this._resetErrMsgOnChange }),
            finalize(() => (this.form.enable(), this._msgBodyInp().nativeElement.focus()))
          )
          .subscribe({
            next: () => this.form.reset(),
            error: createResErrorHandler(this.errorMessage, 'Failed to send your message.'),
          });
      }
    }
  }

  protected isInvalid(controlName: string) {
    const control = this.form.get(controlName);
    return control && control.invalid && control.dirty;
  }

  ngOnInit(): void {
    if (!this.chatId() && !this.profileId()) {
      const error = new Error('Missing `chatId` or `profileId` input.');
      error.name = 'MessageFormInputMissingError';
      throw error;
    }
  }
}
