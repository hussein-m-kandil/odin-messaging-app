import { Component, ElementRef, inject, input, OnInit, signal, viewChild } from '@angular/core';
import { HttpEvent, HttpEventType, HttpUploadProgressEvent } from '@angular/common/http';
import { FormGroup, FormControl, ReactiveFormsModule } from '@angular/forms';
import { ImagePicker } from '../../../images/image-picker';
import { EmojiPicker, PickedEmoji } from './emoji-picker';
import { ColorScheme } from '../../../color-scheme';
import { NgTemplateOutlet } from '@angular/common';
import { ButtonDirective } from 'primeng/button';
import { getResErrMsg } from '../../../utils';
import { MessageService } from 'primeng/api';
import { finalize, Observable } from 'rxjs';
import { Textarea } from 'primeng/textarea';
import { Ripple } from 'primeng/ripple';
import { Chats } from '../../chats';

@Component({
  selector: 'app-message-form',
  imports: [
    ReactiveFormsModule,
    NgTemplateOutlet,
    ButtonDirective,
    ImagePicker,
    EmojiPicker,
    Textarea,
    Ripple,
  ],
  templateUrl: './message-form.html',
  styles: ``,
})
export class MessageForm implements OnInit {
  private readonly _messageInput = viewChild.required<ElementRef<HTMLTextAreaElement>>('msgInp');

  private readonly _toast = inject(MessageService);
  private readonly _chats = inject(Chats);

  protected readonly colorScheme = inject(ColorScheme);

  protected readonly form = new FormGroup({
    body: new FormControl('', { nonNullable: true }),
  });

  protected readonly progress = signal<HttpUploadProgressEvent | null>(null);
  protected readonly picking = signal<'image' | 'emoji' | null>(null);
  protected readonly pickedImage = signal<File | null>(null);

  readonly profileId = input<string>();
  readonly chatId = input<string>();

  protected unpickImage() {
    this.pickedImage.set(null);
    this.progress.set(null);
  }

  protected togglePicker(picker: 'image' | 'emoji') {
    this.picking.update((picking) => {
      if (picking !== picker) return picker;
      if (picker === 'image') this.unpickImage();
      return null;
    });
  }

  protected insertPickedEmoji(emoji: PickedEmoji) {
    this.togglePicker('emoji');
    const { body } = this.form.controls;
    const splittedValue = body.value.split('');
    const { selectionStart, selectionEnd } = this._messageInput().nativeElement;
    splittedValue.splice(selectionStart, selectionEnd - selectionStart, emoji.native);
    body.setValue(splittedValue.join(''));
  }

  protected reset() {
    this.picking.set(null);
    this.unpickImage();
    this.form.reset();
  }

  protected submit() {
    this.form.markAllAsDirty();
    const data = { ...this.form.getRawValue(), image: this.pickedImage() };
    if (this.form.enabled && (data.body || data.image)) {
      const profileId = this.profileId();
      const chatId = this.chatId();
      let req$: Observable<HttpEvent<unknown>> | null = null;
      if (chatId) {
        req$ = this._chats.createMessage(chatId, data);
      } else if (profileId) {
        req$ = this._chats.createChat({ profiles: [profileId], message: data });
      }
      if (req$) {
        this.form.disable();
        req$
          .pipe(
            finalize(() => {
              this.progress.set(null);
              this.form.enable();
              this._messageInput().nativeElement.focus();
            }),
          )
          .subscribe({
            next: (event) => {
              switch (event.type) {
                case HttpEventType.UploadProgress:
                  this.progress.set(event);
                  break;
                case HttpEventType.Response:
                  this.reset();
                  break;
              }
            },
            error: (res) => {
              const defaultMessage = 'Failed to send your message.';
              const message = getResErrMsg(res) || defaultMessage;
              this._toast.add({ severity: 'error', summary: 'Message failed', detail: message });
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
