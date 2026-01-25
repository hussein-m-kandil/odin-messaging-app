import { Component, inject, input, signal } from '@angular/core';
import { getResErrMsg } from '../../utils';
import { Message } from 'primeng/message';
import { Router } from '@angular/router';
import { Button } from 'primeng/button';
import { Image } from '../../app.types';
import { Images } from '../images';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-delete-image',
  imports: [Message, Button],
  templateUrl: './delete-image.html',
  styles: ``,
})
export class DeleteImage {
  private readonly _router = inject(Router);
  private readonly _images = inject(Images);

  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal('');

  readonly imageId = input.required<Image['id']>();
  readonly redirectUrl = input.required<string>();
  readonly isAvatar = input.required<boolean>();

  protected redirect() {
    this._router.navigateByUrl(this.redirectUrl());
  }

  protected submit(event: SubmitEvent) {
    event.preventDefault();
    this.submitting.set(true);
    this._images
      .delete(this.imageId(), this.isAvatar())
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: () => this.redirect(),
        error: (res) => this.errorMessage.set(getResErrMsg(res) || 'Deletion Failed!'),
      });
  }
}
