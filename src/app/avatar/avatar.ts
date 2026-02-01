import { booleanAttribute, Component, input } from '@angular/core';
import { Image } from '../images/image';
import { Profile } from '../app.types';

@Component({
  selector: 'app-avatar',
  imports: [Image],
  templateUrl: './avatar.html',
  host: { class: 'leading-0' },
})
export class Avatar {
  readonly user = input.required<Partial<Pick<Profile['user'], 'username' | 'avatar'>>>();
  readonly preview = input(false, { transform: booleanAttribute });
  readonly size = input<'xs' | 'sm' | 'md' | 'lg' | 'xl'>('md');

  protected getUpdatedImgSrc() {
    const image = this.user().avatar?.image;
    if (image) {
      const srcUrl = new URL(image.src, window.location.href);
      const queryPrefix = srcUrl.search && !srcUrl.search.endsWith('&') ? '&' : '';
      srcUrl.search += `${queryPrefix}updatedAt=${image.updatedAt}`;
      return srcUrl.toString();
    }
    return '';
  }
}
