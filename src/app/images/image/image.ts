import { Image as PrimeImage, ImagePassThrough } from 'primeng/image';
import { input, computed, Component } from '@angular/core';
import { mergeTailwindCNs } from '../../utils';

@Component({
  selector: 'app-image',
  imports: [PrimeImage],
  templateUrl: './image.html',
  host: { class: 'leading-0' },
})
export class Image {
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
  readonly preview = input<boolean | string>();
  readonly imageClass = input<string | string[]>();
  readonly imagePreviewClass = input<string | string[]>();
  readonly imageStyle = input<PrimeImage['imageStyle']>();
}
