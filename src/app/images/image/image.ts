import {
  input,
  computed,
  Component,
  booleanAttribute,
  OnChanges,
  SimpleChanges,
  signal,
} from '@angular/core';
import { Image as PrimeImage, ImagePassThrough } from 'primeng/image';
import { mergeTailwindCNs } from '../../utils';

@Component({
  selector: 'app-image',
  imports: [PrimeImage],
  templateUrl: './image.html',
  host: { class: 'leading-0' },
})
export class Image implements OnChanges {
  protected readonly replaced = signal(false);

  protected readonly pt = computed<ImagePassThrough>(() => ({
    image: {
      width: this.width(),
      height: this.height(),
      class: mergeTailwindCNs('object-center object-cover', this.imageClass() || ''),
    },
    original: mergeTailwindCNs('object-center object-contain p-4', this.imagePreviewClass() || ''),
  }));

  readonly width = input<number>();
  readonly height = input<number>();
  readonly src = input<PrimeImage['src']>();
  readonly alt = input<PrimeImage['alt']>();
  readonly imageClass = input<string | string[]>();
  readonly imagePreviewClass = input<string | string[]>();
  readonly imageStyle = input<PrimeImage['imageStyle']>();
  readonly preview = input(false, { transform: booleanAttribute });

  ngOnChanges(changes: SimpleChanges<Image>): void {
    if (changes.src && !changes.src.isFirstChange()) {
      // Force angular to replace the image element
      this.replaced.set(true);
      setTimeout(() => this.replaced.set(false), 0);
    }
  }
}
