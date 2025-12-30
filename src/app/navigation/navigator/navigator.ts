import { Component, inject, input } from '@angular/core';
import { ErrorMessage } from '../../error-message';
import { Navigation } from '../navigation';
import { Spinner } from '../../spinner';

@Component({
  selector: 'app-navigator',
  imports: [ErrorMessage, Spinner],
  templateUrl: './navigator.html',
  styles: ``,
})
export class Navigator {
  readonly label = input('Loading...');

  protected readonly navigation = inject(Navigation);
}
