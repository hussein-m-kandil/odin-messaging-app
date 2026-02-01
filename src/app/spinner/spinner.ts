import { ProgressSpinner } from 'primeng/progressspinner';
import { Component, input } from '@angular/core';

@Component({
  selector: 'app-spinner',
  imports: [ProgressSpinner],
  templateUrl: './spinner.html',
  styles: ``,
})
export class Spinner {
  readonly ariaLabel = input('');
}
