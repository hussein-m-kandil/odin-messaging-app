import { Component, input, TemplateRef } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { ListLoader } from './list-loader';
import { MenuModule } from 'primeng/menu';
import { ListStore } from './list-store';

@Component({
  selector: 'app-list',
  imports: [MenuModule, ListLoader, NgTemplateOutlet],
  templateUrl: './list.html',
  styles: ``,
})
export class List {
  readonly itemFragment = input.required<TemplateRef<unknown>>();
  readonly store = input.required<ListStore<object>>();
  readonly singularLabel = input.required<string>();
  readonly pluralLabel = input.required<string>();
}
