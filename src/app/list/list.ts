import { input, output, Component, TemplateRef, booleanAttribute } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { ButtonDirective } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { ListLoader } from './list-loader';
import { ListStore } from './list-store';
import { Ripple } from 'primeng/ripple';

@Component({
  selector: 'app-list',
  imports: [NgTemplateOutlet, ListLoader, InputText, ButtonDirective, Ripple],
  templateUrl: './list.html',
  styles: ``,
})
export class List {
  readonly store = input.required<ListStore<{ id: unknown }>>();
  readonly itemFragment = input.required<TemplateRef<unknown>>();
  readonly singularLabel = input.required<string>();
  readonly pluralLabel = input.required<string>();

  readonly searchable = input(false, { transform: booleanAttribute });
  readonly searchValue = input('');

  readonly searched = output<string>();
}
