import { Component, effect, ElementRef, inject, input, output } from '@angular/core';
import { default as data } from '@emoji-mart/data';
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
  template: ``,
  imports: [],
  host: {
    class: '*:w-full *:max-h-[calc(100vh-132px)] *:mx-auto *:overflow-auto',
    'aria-label': 'Emoji Picker',
  },
})
export class EmojiPicker {
  private readonly _hostElement = inject(ElementRef).nativeElement as HTMLElement;

  readonly theme = input<'auto' | 'light' | 'dark'>('auto');

  readonly picked = output<PickedEmoji>();
  readonly closed = output();

  constructor() {
    effect(() => {
      const picker = new Picker({
        data,
        dynamicWidth: true,
        theme: this.theme(),
        previewPosition: 'none',
        skinTonePosition: 'none',
        onClickOutside: () => this.closed.emit(),
        onEmojiSelect: (emoji: PickedEmoji) => this.picked.emit(emoji),
      }) as unknown as HTMLElement;
      const assertEveryInputHasId = () => {
        picker.shadowRoot
          ?.querySelectorAll('input')
          .forEach((input, i) => (input.id = input.id || `emoji-picker-input-${i + 1}`));
      };
      this._hostElement.childNodes.forEach((node) => this._hostElement.removeChild(node));
      this._hostElement.appendChild(picker);
      setTimeout(assertEveryInputHasId, 0);
    });
  }
}
