import { Component, ElementRef, inject, input, OnInit, signal, viewChild } from '@angular/core';
import {
  HttpErrorResponse,
  HttpEvent,
  HttpEventType,
  HttpUploadProgressEvent,
} from '@angular/common/http';
import { FormGroup, FormControl, ReactiveFormsModule } from '@angular/forms';
import { createResErrorHandler } from '../../../utils';
import { ImagePicker } from '../../../image-picker';
import { TextareaModule } from 'primeng/textarea';
import { ButtonDirective } from 'primeng/button';
import { MessageService } from 'primeng/api';
import { finalize, Observable } from 'rxjs';
import { Ripple } from 'primeng/ripple';
import { Chats } from '../../chats';

@Component({
  selector: 'app-message-form',
  imports: [ReactiveFormsModule, TextareaModule, ButtonDirective, ImagePicker, Ripple],
  templateUrl: './message-form.html',
  styles: ``,
})
export class MessageForm implements OnInit {
  private readonly _messageInput = viewChild.required<ElementRef<HTMLTextAreaElement>>('msgInp');

  private readonly _toast = inject(MessageService);
  private readonly _chats = inject(Chats);

  protected readonly form = new FormGroup({
    body: new FormControl('', { nonNullable: true }),
  });

  protected readonly progress = signal<HttpUploadProgressEvent | null>(null);
  protected readonly pickedImage = signal<File | null>(null);
  protected readonly pickingImage = signal(false);

  readonly profileId = input<string>();
  readonly chatId = input<string>();

  protected unpickImage() {
    this.pickedImage.set(null);
    this.progress.set(null);
  }

  protected closeImagePicker() {
    this.unpickImage();
    this.pickingImage.set(false);
  }

  protected toggleImagePicker() {
    this.pickingImage.update((picking) => {
      if (picking) this.unpickImage();
      return !picking;
    });
  }

  protected reset() {
    this.closeImagePicker();
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
        req$ = this._chats.create({ profiles: [profileId], message: data });
      }
      if (req$) {
        this.form.disable();
        req$
          .pipe(finalize(() => (this.form.enable(), this._messageInput().nativeElement.focus())))
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
              const defaultErrorMessage = 'Failed to send your message.';
              let message = defaultErrorMessage;
              const fakeSignal = { set: (msg: string) => (message = msg) };
              createResErrorHandler(fakeSignal, defaultErrorMessage)(res);
              if (
                message === defaultErrorMessage &&
                res instanceof HttpErrorResponse &&
                res.status === 400
              ) {
                const { error } = res;
                if (error.error) {
                  if (typeof error.error === 'string') message = error.error;
                  else if (typeof error.error.message === 'string') message = error.error.message;
                } else if (typeof error.message === 'string') message = error.message;
                else if (typeof error === 'string') message = error;
              }
              this._toast.add({
                severity: 'error',
                summary: 'Message failed',
                detail: message,
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
