import { Component, inject, input, signal } from '@angular/core';
import { HttpErrorResponse, HttpEventType, HttpUploadProgressEvent } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { createResErrorHandler } from '../../utils';
import { ImagePicker } from '../image-picker';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Images } from '..';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-image-form',
  imports: [ImagePicker, Button],
  templateUrl: './image-form.html',
  styles: ``,
})
export class ImageForm {
  private readonly _activatedRoute = inject(ActivatedRoute);
  private readonly _router = inject(Router);

  private readonly _toast = inject(MessageService);
  private readonly _images = inject(Images);

  protected readonly progress = signal<HttpUploadProgressEvent | null>(null);
  protected readonly image = signal<File | null>(null);
  protected readonly submitting = signal(false);

  readonly isAvatar = input.required<boolean>();

  protected unpick() {
    this.image.set(null);
    this.progress.set(null);
  }

  protected goBack() {
    this.unpick();
    this._router.navigate(['..'], { relativeTo: this._activatedRoute });
  }

  protected submit(event: SubmitEvent) {
    event.preventDefault();
    const image = this.image();
    const isAvatar = this.isAvatar();
    if (image) {
      this.submitting.set(true);
      this._images
        .upload(image, { isAvatar })
        .pipe(
          finalize(() => {
            this.progress.set(null);
            this.submitting.set(false);
          }),
        )
        .subscribe({
          next: (event) => {
            switch (event.type) {
              case HttpEventType.UploadProgress:
                this.progress.set(event);
                break;
              case HttpEventType.Response:
                this.goBack();
                break;
            }
          },
          error: (res) => {
            const defaultErrorMessage = `Failed to upload your ${isAvatar ? 'picture' : 'image'}.`;
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
            this._toast.add({ severity: 'error', summary: 'Upload failed', detail: message });
          },
        });
    }
  }
}
