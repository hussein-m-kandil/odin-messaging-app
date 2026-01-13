import { Component, computed, inject, input, output, signal } from '@angular/core';
import { FileUpload, FileSelectEvent } from 'primeng/fileupload';
import { ProgressBar } from 'primeng/progressbar';
import { ButtonDirective } from 'primeng/button';
import { PrimeNG } from 'primeng/config';
import { Ripple } from 'primeng/ripple';

@Component({
  selector: 'app-image-picker',
  imports: [FileUpload, ButtonDirective, ProgressBar, Ripple],
  templateUrl: './image-picker.html',
  styles: ``,
})
export class ImagePicker {
  protected readonly FILE_INDEX = 0;

  private readonly _primeNG = inject(PrimeNG);

  private readonly _imageBytes = signal(0);

  readonly picked = output<FileSelectEvent['currentFiles'][number]>();
  readonly canceled = output();
  readonly unpicked = output();

  readonly progress = input<{ loaded?: number; total?: number } | null>(null);

  protected readonly uploadPercentage = computed<number>(() => {
    const progress = this.progress();
    if (progress && progress.loaded && progress.total) {
      return (progress.loaded / progress.total) * 100;
    }
    return 0;
  });

  protected pick(event: FileSelectEvent) {
    const pickedImageFile = event.currentFiles[this.FILE_INDEX];
    if (pickedImageFile) {
      this.picked.emit(pickedImageFile);
      this._imageBytes.set(pickedImageFile.size);
    }
  }

  protected unpick() {
    this._imageBytes.set(0);
    this.unpicked.emit();
  }

  protected cancel() {
    this._imageBytes.set(0);
    this.canceled.emit();
  }

  protected getFormattedSize() {
    const K = 1024;
    const FRAC_DIGITS = 1;
    const imageBytes = this._imageBytes();
    const sizeUnits = this._primeNG.translation.fileSizeTypes;
    if (sizeUnits) {
      if (imageBytes < K) return `${imageBytes} ${sizeUnits[0]}`;
      const unitIndex = Math.floor(Math.log(imageBytes) / Math.log(K));
      const formattedSize = parseFloat((imageBytes / Math.pow(K, unitIndex)).toFixed(FRAC_DIGITS));
      return `${formattedSize} ${sizeUnits[unitIndex]}`;
    }
    return `${imageBytes} B`;
  }
}
