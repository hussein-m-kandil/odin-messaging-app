import {
  FormGroup,
  Validators,
  FormControl,
  ValueChangeEvent,
  ReactiveFormsModule,
} from '@angular/forms';
import { Component, ElementRef, inject, input, OnInit, signal, viewChild } from '@angular/core';
import { filter, finalize, Observable, take, takeLast, tap } from 'rxjs';
import { createResErrorHandler } from '../../../utils';
import { Messages } from '../messages';
import { Chats } from '../../chats';

@Component({
  selector: 'app-message-form',
  imports: [ReactiveFormsModule],
  templateUrl: './message-form.html',
  styles: ``,
})
export class MessageForm implements OnInit {
  private readonly _msgBodyInp = viewChild.required<ElementRef<HTMLTextAreaElement>>('msgBody');

  private readonly _chats = inject(Chats);
  private readonly _messages = inject(Messages);

  readonly profileId = input<string>();
  readonly chatId = input<string>();

  protected readonly errMsg = signal('');

  protected readonly form = new FormGroup({
    body: new FormControl('', { validators: [Validators.required], nonNullable: true }),
  });

  private readonly _resetErrMsgOnChange = () => {
    /* 
      Reset the error message after the first user change,
      while ignoring the change event triggered by re-enabling the form.
    */
    const isChangeEvent = (e: unknown) => e instanceof ValueChangeEvent;
    this.form.events
      .pipe(filter(isChangeEvent), take(2), takeLast(1))
      .subscribe(() => this.errMsg.set(''));
  };

  protected submit() {
    this.errMsg.set('');
    this.form.markAllAsDirty();
    if (this.form.enabled && this.form.valid) {
      const newMessageData = this.form.getRawValue();
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
            error: createResErrorHandler(this.errMsg, 'Failed to send your message.'),
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
