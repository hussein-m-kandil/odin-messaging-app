import { render, RenderComponentOptions, screen } from '@testing-library/angular';
import { userEvent } from '@testing-library/user-event';
import { Image } from './image';

const renderComponent = (options: RenderComponentOptions<Image> = {}) => {
  return render(Image, { autoDetectChanges: false, ...options });
};

describe('Image', () => {
  it('should render an image with the given inputs', async () => {
    const inputs = { alt: 'foo bar', src: 'http://localhost:3000/img.png', width: 7, height: 9 };
    await renderComponent({ inputs });
    const img = screen.getByRole('img');
    expect(img).toHaveProperty('alt', inputs.alt);
    expect(img).toHaveProperty('src', inputs.src);
    expect(img).toHaveProperty('width', inputs.width);
    expect(img).toHaveProperty('height', inputs.height);
  });

  it('should render an image with the given class', async () => {
    const imageClass = 'foo bar-tar';
    await renderComponent({ inputs: { imageClass } });
    expect(screen.getByRole('img')).toHaveClass(imageClass);
  });

  it('should render an image with the given classes', async () => {
    const imageClass = 'foo bar-tar';
    await renderComponent({ inputs: { imageClass: imageClass.split(' ') } });
    expect(screen.getByRole('img')).toHaveClass(imageClass);
  });

  it('should render an image with the given style', async () => {
    await renderComponent({ inputs: { imageStyle: { 'max-width': 17 } } });
    expect(screen.getByRole('img')).toHaveStyle('max-width: 17');
  });

  it('should not render a preview button, if not given the preview input', async () => {
    await renderComponent();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('should not render a preview button, if given `false` the preview input', async () => {
    await renderComponent({ inputs: { preview: false } });
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('should not render a preview button, if the string "false" the preview input', async () => {
    await renderComponent({ inputs: { preview: 'false' } });
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('should render a preview button, if given empty string for the preview input', async () => {
    await renderComponent({ inputs: { preview: '' } });
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('should render a preview button, if given any string for the preview input', async () => {
    await renderComponent({ inputs: { preview: 'foo' } });
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('should render a preview button, if given `true` for the preview input', async () => {
    await renderComponent({ inputs: { preview: true } });
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('should render an image preview with the given class', async () => {
    vi.useFakeTimers();
    const imagePreviewClass = 'foo bar-tar';
    const actor = userEvent.setup({ advanceTimers: vi.advanceTimersByTimeAsync });
    await renderComponent({ inputs: { imagePreviewClass, preview: true } });
    await actor.click(screen.getByRole('button'));
    await vi.runAllTimersAsync();
    expect(screen.getAllByRole('img')[1]).toHaveClass(imagePreviewClass);
    vi.useRealTimers();
  });

  it('should render an image preview with the given classes', async () => {
    vi.useFakeTimers();
    const actor = userEvent.setup({ advanceTimers: vi.advanceTimersByTimeAsync });
    const imagePreviewClass = ['foo', 'bar-tar'];
    await renderComponent({ inputs: { imagePreviewClass, preview: true } });
    await actor.click(screen.getByRole('button'));
    await vi.runAllTimersAsync();
    expect(screen.getAllByRole('img')[1]).toHaveClass(imagePreviewClass.join(' '));
    vi.useRealTimers();
  });
});
