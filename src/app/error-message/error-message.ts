import { Component, input, output } from '@angular/core';
import { ButtonDirective } from 'primeng/button';
import { Ripple } from 'primeng/ripple';

@Component({
  selector: 'app-error-message',
  imports: [ButtonDirective, Ripple],
  templateUrl: './error-message.html',
  styles: ``,
})
export class ErrorMessage {
  readonly message = input.required<string>();
  readonly retry = output();
}
