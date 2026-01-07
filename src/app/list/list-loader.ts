import {
  input,
  output,
  inject,
  Injector,
  viewChild,
  OnDestroy,
  OnChanges,
  Component,
  ElementRef,
  afterNextRender,
} from '@angular/core';
import { ButtonDirective } from 'primeng/button';
import { ErrorMessage } from '../error-message';
import { Ripple } from 'primeng/ripple';
import { Spinner } from '../spinner';

@Component({
  selector: 'app-list-loader',
  imports: [ButtonDirective, ErrorMessage, Spinner, Ripple],
  templateUrl: './list-loader.html',
  styles: ``,
})
export class ListLoader implements OnChanges, OnDestroy {
  private readonly _injector = inject(Injector);
  private readonly _loadMoreBtn = viewChild<ElementRef<HTMLButtonElement>>('loadMoreBtn');
  private readonly _loadMoreObserver = new IntersectionObserver((entries, observer) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        this.loaded.emit();
        observer.unobserve(entry.target);
      }
    }
  });

  readonly pluralLabel = input.required<string>();
  readonly loadError = input.required<string>();
  readonly loading = input.required<boolean>();
  readonly hasMore = input.required<boolean>();
  readonly listSize = input.required<number>();

  readonly loaded = output();

  ngOnChanges() {
    afterNextRender(
      () => {
        const loadMoreBtn = this._loadMoreBtn()?.nativeElement;
        if (loadMoreBtn) this._loadMoreObserver.observe(loadMoreBtn);
      },
      { injector: this._injector }
    );
  }

  ngOnDestroy() {
    this._loadMoreObserver.disconnect();
  }
}
