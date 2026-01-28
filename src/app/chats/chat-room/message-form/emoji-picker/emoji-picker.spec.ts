import { render, RenderComponentOptions, screen } from '@testing-library/angular';
import { EmojiPicker } from './emoji-picker';

const renderComponent = ({ inputs, ...options }: RenderComponentOptions<EmojiPicker> = {}) => {
  return render(EmojiPicker, {
    inputs: { theme: 'light', ...inputs },
    autoDetectChanges: false,
    ...options,
  });
};

describe('EmojiPicker', () => {
  it('should have a label', async () => {
    await renderComponent();
    expect(screen.getByLabelText(/emoji picker/i)).toBeVisible();
  });
});
