import {
  input,
  output,
  inject,
  signal,
  Component,
  ElementRef,
  afterRenderEffect,
} from '@angular/core';
import { ErrorMessage } from '../../../../error-message';
import { Spinner } from '../../../../spinner';
import { Picker } from 'emoji-mart';

export interface PickedEmoji {
  id: string;
  name: string;
  native: string;
  unified: string;
  shortcodes: string;
  emoticons: string[];
  keywords: string[];
}

@Component({
  selector: 'app-emoji-picker',
  imports: [ErrorMessage, Spinner],
  templateUrl: './emoji-picker.html',
  host: {
    class: '*:w-full *:max-h-[calc(100vh-132px)] *:mx-auto *:overflow-auto',
    'aria-label': 'Emoji Picker',
  },
})
export class EmojiPicker {
  private readonly _hostElement = inject(ElementRef).nativeElement as HTMLElement;

  protected readonly data = signal<unknown>(null);
  protected readonly errorMessage = signal('');

  readonly theme = input<'auto' | 'light' | 'dark'>('auto');

  readonly picked = output<PickedEmoji>();
  readonly closed = output();

  protected loadData() {
    this.errorMessage.set('');
    import('@emoji-mart/data')
      .then((dataModule) => this.data.set(dataModule.default))
      .catch(() => this.errorMessage.set('Failed to load the emojis.'));
  }

  constructor() {
    this.loadData();
    afterRenderEffect((onCleanup) => {
      const data = this.data();
      if (data) {
        const picker = new Picker({
          data,
          dynamicWidth: true,
          theme: this.theme(),
          previewPosition: 'none',
          skinTonePosition: 'none',
          onClickOutside: () => this.closed.emit(),
          onEmojiSelect: (emoji: PickedEmoji) => this.picked.emit(emoji),
        }) as unknown as HTMLElement;
        this._hostElement.childNodes.forEach((node) => this._hostElement.removeChild(node));
        this._hostElement.appendChild(picker);
        const timeoutId = setTimeout(() => {
          // Assert every input in the picker has an id to avoid browser issues
          picker.shadowRoot
            ?.querySelectorAll('input')
            .forEach((input, i) => (input.id = input.id || `emoji-picker-input-${i + 1}`));
        }, 0);
        onCleanup(() => clearTimeout(timeoutId));
      }
    });
  }
}
