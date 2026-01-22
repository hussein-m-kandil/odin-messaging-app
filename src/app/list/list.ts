import { Component, input, TemplateRef } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { ListLoader } from './list-loader';
import { ListStore } from './list-store';

@Component({
  selector: 'app-list',
  imports: [NgTemplateOutlet, ListLoader],
  templateUrl: './list.html',
  styles: ``,
})
export class List {
  readonly store = input.required<ListStore<{ id: unknown }>>();
  readonly itemFragment = input.required<TemplateRef<unknown>>();
  readonly singularLabel = input.required<string>();
  readonly pluralLabel = input.required<string>();
}
