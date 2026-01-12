import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonDirective } from 'primeng/button';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink, ButtonDirective],
  templateUrl: './not-found.html',
  styles: ``,
})
export class NotFound {}
