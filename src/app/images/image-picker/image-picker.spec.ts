import { render, RenderComponentOptions, screen } from '@testing-library/angular';
import { ImagePicker } from './image-picker';
import userEvent from '@testing-library/user-event';

const picked = vi.fn();
const unpicked = vi.fn();
const canceled = vi.fn();

const renderComponent = ({ inputs, on, ...options }: RenderComponentOptions<ImagePicker> = {}) => {
  return render(ImagePicker, {
    inputs: { progress: null, disabled: false, ...inputs },
    on: { canceled, unpicked, picked, ...on },
    ...options,
  });
};

describe('ImagePicker', () => {
  afterEach(vi.resetAllMocks);

  it('should be empty', async () => {
    await renderComponent();
    expect(screen.getByRole('button', { name: /cancel image picking/i })).toBeVisible();
    expect(screen.getByRole('button', { name: /cancel image picking/i })).toBeEnabled();
    expect(screen.queryByRole('button', { name: /unpick image/i })).toBeNull();
    expect(screen.getByRole('button', { name: /pick an image/i })).toBeVisible();
    expect(screen.getByRole('button', { name: /pick an image/i })).toBeEnabled();
    expect(screen.getByText(/drag an image and drop it here/i)).toBeVisible();
    expect(screen.getByLabelText(/browse files/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/browse files/i)).toBeEnabled();
    expect(screen.queryByLabelText(/uploading/i)).toBeNull();
    expect(screen.getByRole('progressbar')).toHaveValue(0);
    expect(screen.queryByRole('presentation')).toBeNull();
    expect(screen.queryByRole('img')).toBeNull();
    expect(canceled).toHaveBeenCalledTimes(0);
    expect(unpicked).toHaveBeenCalledTimes(0);
    expect(picked).toHaveBeenCalledTimes(0);
  });

  it('should use the word "picture" instead of using "image"', async () => {
    await renderComponent({ inputs: { kind: 'picture' } });
    expect(screen.getByRole('button', { name: /cancel picture picking/i })).toBeVisible();
    expect(screen.getByRole('button', { name: /cancel picture picking/i })).toBeEnabled();
    expect(screen.queryByRole('button', { name: /unpick picture/i })).toBeNull();
    expect(screen.getByRole('button', { name: /pick a picture/i })).toBeVisible();
    expect(screen.getByRole('button', { name: /pick a picture/i })).toBeEnabled();
    expect(screen.getByText(/drag a picture and drop it here/i)).toBeVisible();
    expect(screen.getByLabelText(/browse files/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/browse files/i)).toBeEnabled();
    expect(screen.queryByLabelText(/uploading/i)).toBeNull();
    expect(screen.getByRole('progressbar')).toHaveValue(0);
    expect(screen.queryByRole('presentation')).toBeNull();
    expect(screen.queryByRole('img')).toBeNull();
    expect(canceled).toHaveBeenCalledTimes(0);
    expect(unpicked).toHaveBeenCalledTimes(0);
    expect(picked).toHaveBeenCalledTimes(0);
  });

  it('should not pick a non-image file', async () => {
    const actor = userEvent.setup();
    await renderComponent();
    const imageName = 'img.png';
    const imageFile = new File([], imageName);
    await actor.upload(screen.getByLabelText(/browse files/i), imageFile);
    expect(screen.getByText(/drag .* drop/i)).toBeVisible();
    expect(screen.queryByRole('presentation')).toBeNull();
    expect(screen.queryByText(imageName)).toBeNull();
    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.queryByText('0 B')).toBeNull();
  });

  it('should pick an image file', async () => {
    const actor = userEvent.setup();
    await renderComponent();
    const imageName = 'img.png';
    const imageFile = new File([], imageName, { type: 'image/png' });
    await actor.upload(screen.getByLabelText(/browse files/i), imageFile);
    const presentImg = screen.getByRole('presentation') as HTMLImageElement;
    expect(screen.getByRole('button', { name: /unpick .*image/i })).toBeVisible();
    expect(screen.queryByText(/drag .* drop/i)).toBeNull();
    expect(screen.queryByRole('img')).toBeNull();
    expect(presentImg).toBeVisible();
    expect(presentImg.src).toMatch(/^blob:.{28,}/);
    expect(presentImg).toHaveAttribute('alt', imageName);
    expect(picked).toHaveBeenCalledExactlyOnceWith(imageFile);
    expect(unpicked).toHaveBeenCalledTimes(0);
    expect(canceled).toHaveBeenCalledTimes(0);
    expect(screen.getByText(imageName)).toBeVisible();
    expect(screen.getByText('0 B')).toBeVisible();
  });

  it('should pick the first image file', async () => {
    const actor = userEvent.setup();
    await renderComponent();
    const imageName = 'img.png';
    const imageFile = new File([], imageName, { type: 'image/png' });
    await actor.upload(screen.getByLabelText(/browse files/i), [
      imageFile,
      new File([], 'img.jpg', { type: 'image/jpeg' }),
    ]);
    const presentImg = screen.getByRole('presentation') as HTMLImageElement;
    expect(screen.getByRole('button', { name: /unpick .*image/i })).toBeVisible();
    expect(screen.queryByText(/drag .* drop/i)).toBeNull();
    expect(screen.queryByRole('img')).toBeNull();
    expect(presentImg).toBeVisible();
    expect(presentImg.src).toMatch(/^blob:.{28,}/);
    expect(presentImg).toHaveAttribute('alt', imageName);
    expect(picked).toHaveBeenCalledExactlyOnceWith(imageFile);
    expect(unpicked).toHaveBeenCalledTimes(0);
    expect(canceled).toHaveBeenCalledTimes(0);
    expect(screen.getByText(imageName)).toBeVisible();
    expect(screen.getByText('0 B')).toBeVisible();
  });

  it('should unpick the picked image file', async () => {
    const actor = userEvent.setup();
    await renderComponent();
    const imageName = 'img.png';
    const imageFile = new File([], imageName, { type: 'image/png' });
    await actor.upload(screen.getByLabelText(/browse files/i), imageFile);
    await actor.click(screen.getByRole('button', { name: /unpick .*image/i }));
    expect(screen.getByText(/drag .* drop/i)).toBeVisible();
    expect(screen.queryByRole('presentation')).toBeNull();
    expect(screen.queryByText(imageName)).toBeNull();
    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.queryByText('0 B')).toBeNull();
    expect(canceled).toHaveBeenCalledTimes(0);
    expect(picked).toHaveBeenCalledExactlyOnceWith(imageFile);
    expect(unpicked).toHaveBeenCalledExactlyOnceWith(undefined);
  });

  it('should cancel the image picking', async () => {
    const actor = userEvent.setup();
    await renderComponent();
    const imageName = 'img.png';
    const imageFile = new File([], imageName, { type: 'image/png' });
    await actor.upload(screen.getByLabelText(/browse files/i), imageFile);
    await actor.click(screen.getByRole('button', { name: /cancel .*image picking/i }));
    expect(screen.getByText(/drag .* drop/i)).toBeVisible();
    expect(screen.queryByRole('presentation')).toBeNull();
    expect(screen.queryByText(imageName)).toBeNull();
    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.queryByText('0 B')).toBeNull();
    expect(unpicked).toHaveBeenCalledTimes(0);
    expect(picked).toHaveBeenCalledExactlyOnceWith(imageFile);
    expect(canceled).toHaveBeenCalledExactlyOnceWith(undefined);
  });

  it('should be enabled', async () => {
    const actor = userEvent.setup();
    await renderComponent({ inputs: { disabled: false, progress: null } });
    const imageFile = new File([], 'img.png', { type: 'image/png' });
    expect(screen.getByLabelText(/browse files/i)).toBeEnabled();
    await actor.upload(screen.getByLabelText(/browse files/i), imageFile);
    expect(screen.getByRole('button', { name: /cancel .*image picking/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /unpick .*image/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /^pick .*image/i })).toBeEnabled();
    expect(screen.getByLabelText(/browse files/i)).toBeDisabled();
  });

  it('should be disabled', async () => {
    const actor = userEvent.setup();
    const { rerender } = await renderComponent({ inputs: { disabled: false, progress: null } });
    const imageFile = new File([], 'img.png', { type: 'image/png' });
    await actor.upload(screen.getByLabelText(/browse files/i), imageFile);
    await rerender({ inputs: { disabled: true, progress: null } });
    expect(screen.getByRole('button', { name: /cancel .*image picking/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /unpick .*image/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /^pick .*image/i })).toBeDisabled();
    expect(screen.getByLabelText(/browse files/i)).toBeDisabled();
  });

  it('should be disabled while uploading', async () => {
    const actor = userEvent.setup();
    const { rerender } = await renderComponent({ inputs: { disabled: false, progress: null } });
    const imageFile = new File([], 'img.png', { type: 'image/png' });
    await actor.upload(screen.getByLabelText(/browse files/i), imageFile);
    await rerender({ inputs: { disabled: false, progress: {} } });
    expect(screen.getByRole('button', { name: /cancel .*image picking/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /unpick .*image/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /^pick .*image/i })).toBeDisabled();
    expect(screen.getByLabelText(/browse files/i)).toBeDisabled();
  });

  it('should cancel', async () => {
    const actor = userEvent.setup();
    await renderComponent();
    await actor.click(screen.getByRole('button', { name: /cancel .*image picking/i }));
    expect(screen.getByText(/drag .* drop/i)).toBeVisible();
    expect(screen.queryByRole('presentation')).toBeNull();
    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.queryByText('0 B')).toBeNull();
    expect(picked).toHaveBeenCalledTimes(0);
    expect(unpicked).toHaveBeenCalledTimes(0);
    expect(canceled).toHaveBeenCalledExactlyOnceWith(undefined);
  });

  it('should represent the given progress', async () => {
    const { rerender } = await renderComponent({
      inputs: { progress: { loaded: 9.25, total: 10 } },
    });
    expect(screen.getByRole('progressbar')).toHaveValue(92.5);
    await rerender({ inputs: { progress: { loaded: 3.75, total: 10 } } });
    expect(screen.getByRole('progressbar')).toHaveValue(37.5);
  });

  it('should show the loading indicator', async () => {
    const { rerender } = await renderComponent({ inputs: { progress: {} } });
    expect(screen.getByLabelText(/uploading/i)).toBeVisible();
    await rerender({ inputs: { progress: { loaded: 3.75, total: 10 } } });
    expect(screen.getByLabelText(/uploading/i)).toBeVisible();
  });
});
