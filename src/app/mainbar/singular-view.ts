import { computed, Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class SingularView {
  private readonly _enabled = signal(false);

  readonly enabled = this._enabled.asReadonly();
  readonly disabled = computed(() => !this._enabled());

  enable() {
    this._enabled.set(true);
  }

  disable() {
    this._enabled.set(false);
  }

  toggle() {
    this._enabled.update((enabled) => !enabled);
  }
}
