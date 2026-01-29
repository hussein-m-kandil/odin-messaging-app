import { render, screen, RenderComponentOptions } from '@testing-library/angular';
import { EmojiPicker } from './emoji-picker';
import emojisData from '@emoji-mart/data';

const renderComponent = ({ inputs, ...options }: RenderComponentOptions<EmojiPicker> = {}) => {
  return render(EmojiPicker, {
    inputs: { theme: 'light', ...inputs },
    autoDetectChanges: false,
    ...options,
  });
};

describe('EmojiPicker', () => {
  const emojisDataModuleMock = vi.fn<() => { default: unknown }>(() => {
    // Note: Keep the default is throwing an error because the browser (JSDOM)
    // will cache any non-error result, after that, this mock will not get called again.
    throw new Error('Test import emojis error');
  });
  beforeAll(() => vi.doMock('@emoji-mart/data', emojisDataModuleMock));
  afterAll(() => vi.doUnmock('@emoji-mart/data'));
  afterEach(vi.resetAllMocks);

  it('should have a label', async () => {
    await renderComponent();
    expect(screen.getByLabelText(/emoji picker/i)).toBeVisible();
    await vi.dynamicImportSettled();
    expect(emojisDataModuleMock).toHaveBeenCalledOnce();
  });

  it('should display a loader and not have an error', async () => {
    await renderComponent();
    expect(screen.getByLabelText(/loading emojis/i)).toBeVisible();
    expect(screen.queryByText(/failed/i)).toBeNull();
    await vi.dynamicImportSettled();
    expect(emojisDataModuleMock).toHaveBeenCalledOnce();
  });

  it('should display an error and not have a loader', async () => {
    const { detectChanges } = await renderComponent();
    await vi.dynamicImportSettled();
    detectChanges();
    expect(screen.queryByLabelText(/loading emojis/i)).toBeNull();
    expect(screen.getByText(/failed/i)).toBeVisible();
    expect(emojisDataModuleMock).toHaveBeenCalledOnce();
  });

  it('should not have a loader nor an error', async () => {
    emojisDataModuleMock.mockImplementationOnce(() => ({ default: emojisData }));
    const { detectChanges } = await renderComponent();
    await vi.dynamicImportSettled();
    detectChanges();
    expect(screen.queryByLabelText(/loading emojis/i)).toBeNull();
    expect(screen.queryByText(/failed/i)).toBeNull();
    expect(emojisDataModuleMock).toHaveBeenCalledOnce();
  });
});
