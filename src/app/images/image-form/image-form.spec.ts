import { render, RenderComponentOptions, screen } from '@testing-library/angular';
import { ActivatedRoute, NavigationExtras, Router } from '@angular/router';
import { HttpEventType, HttpResponse } from '@angular/common/http';
import { userEvent } from '@testing-library/user-event';
import { Observable, Subscriber } from 'rxjs';
import { MessageService } from 'primeng/api';
import { ImageForm } from './image-form';
import { Toast } from 'primeng/toast';
import { Images } from '../images';

const navigationSpy = vi.spyOn(Router.prototype, 'navigate');

const imagesMock = { upload: vi.fn() };

const renderComponent = ({
  providers,
  inputs,
  ...options
}: RenderComponentOptions<ImageForm> = {}) => {
  const isAvatar = inputs?.isAvatar || false;
  return render(`<app-image-form [isAvatar]="${isAvatar}" /><p-toast />`, {
    providers: [MessageService, { provide: Images, useValue: imagesMock }, ...(providers || [])],
    imports: [ImageForm, Toast],
    autoDetectChanges: false,
    ...options,
  });
};

const getFormElements = (isAvatar = false) => ({
  form: screen.getByRole('form', { name: isAvatar ? /picture/i : /image/i }),
  fileInput: screen.getByLabelText(/browse files/i),
  uploader: screen.getByRole('button', { name: /upload/i }),
  canceler: screen.getByRole('button', { name: /cancel/i }),
  picker: screen.getByRole('button', { name: isAvatar ? /pick a picture/i : /pick an image/i }),
});

describe('ImageForm', () => {
  afterEach(vi.resetAllMocks);

  it('should display a picture form', async () => {
    const isAvatar = true;
    await renderComponent({ inputs: { isAvatar: true } });
    const { form, picker, uploader, canceler, fileInput } = getFormElements(isAvatar);
    expect(form).toBeVisible();
    expect(picker).toBeVisible();
    expect(canceler).toBeVisible();
    expect(uploader).toBeVisible();
    expect(uploader).toBeDisabled();
    expect(fileInput).toBeInTheDocument();
    expect(uploader).toHaveProperty('type', 'submit');
  });

  it('should display an image form', async () => {
    const isAvatar = false;
    await renderComponent({ inputs: { isAvatar } });
    const { form, picker, uploader, canceler, fileInput } = getFormElements(isAvatar);
    expect(form).toBeVisible();
    expect(picker).toBeVisible();
    expect(canceler).toBeVisible();
    expect(uploader).toBeVisible();
    expect(uploader).toBeDisabled();
    expect(fileInput).toBeInTheDocument();
    expect(uploader).toHaveProperty('type', 'submit');
  });

  it('should navigate back when canceled', async () => {
    const actor = userEvent.setup();
    await renderComponent();
    await actor.click(screen.getByRole('button', { name: /cancel/i }));
    expect(navigationSpy).toHaveBeenCalledTimes(1);
    expect(navigationSpy.mock.calls[0]).toHaveLength(2);
    expect(navigationSpy.mock.calls[0][0]).toStrictEqual(['..']);
    expect((navigationSpy.mock.calls[0][1] as NavigationExtras).relativeTo).toBeInstanceOf(
      ActivatedRoute,
    );
  });

  for (const isAvatar of [true, false]) {
    it(`should upload ${isAvatar ? 'a picture' : 'an image'}`, async () => {
      let sub!: Subscriber<unknown>;
      imagesMock.upload.mockImplementation(() => new Observable((s) => (sub = s)));
      const image = new File([], 'img.png', { type: 'image/png' });
      const actor = userEvent.setup();
      const { detectChanges } = await renderComponent({ inputs: { isAvatar } });
      const { fileInput, uploader, canceler, picker } = getFormElements(isAvatar);
      await actor.upload(fileInput, image);
      expect(uploader).toBeEnabled();
      await actor.click(uploader);
      expect(picker).toBeDisabled();
      expect(uploader).toBeDisabled();
      expect(canceler).toBeDisabled();
      expect(fileInput).toBeDisabled();
      sub.next({ type: HttpEventType.UploadProgress, loaded: 3.5, total: 10 });
      detectChanges();
      expect(screen.getByRole('progressbar')).toHaveValue(35);
      sub.next(new HttpResponse({ status: 201 }));
      sub.complete();
      detectChanges();
      expect(imagesMock.upload).toHaveBeenCalledExactlyOnceWith(image, { isAvatar });
      expect(picker).toBeEnabled();
      expect(canceler).toBeEnabled();
      expect(uploader).toBeDisabled();
      expect(navigationSpy).toHaveBeenCalledTimes(1);
      expect(navigationSpy.mock.calls[0]).toHaveLength(2);
      expect(navigationSpy.mock.calls[0][0]).toStrictEqual(['..']);
      expect((navigationSpy.mock.calls[0][1] as NavigationExtras).relativeTo).toBeInstanceOf(
        ActivatedRoute,
      );
    });

    it(`should fail to upload ${isAvatar ? 'a picture' : 'an image'}`, async () => {
      vi.useFakeTimers();
      let sub!: Subscriber<unknown>;
      imagesMock.upload.mockImplementation(() => new Observable((s) => (sub = s)));
      const image = new File([], 'img.png', { type: 'image/png' });
      const actor = userEvent.setup({ advanceTimers: vi.advanceTimersByTimeAsync });
      const { detectChanges } = await renderComponent({ inputs: { isAvatar } });
      const { fileInput, uploader, canceler, picker } = getFormElements(isAvatar);
      await actor.upload(fileInput, image);
      expect(uploader).toBeEnabled();
      await actor.click(uploader);
      expect(picker).toBeDisabled();
      expect(uploader).toBeDisabled();
      expect(canceler).toBeDisabled();
      expect(fileInput).toBeDisabled();
      sub.next({ type: HttpEventType.UploadProgress, loaded: 3.5, total: 10 });
      detectChanges();
      expect(screen.getByRole('progressbar')).toHaveValue(35);
      sub.error(new Error('Test error'));
      detectChanges();
      expect(picker).toBeEnabled();
      expect(picker).toBeVisible();
      expect(canceler).toBeEnabled();
      expect(canceler).toBeVisible();
      expect(uploader).toBeEnabled();
      expect(uploader).toBeVisible();
      expect(fileInput).toBeDisabled();
      expect(fileInput).toBeInTheDocument();
      expect(screen.getByText(/upload failed/i)).toBeVisible();
      expect(screen.getByText(/failed to upload your (image|picture)/i)).toBeVisible();
      expect(imagesMock.upload).toHaveBeenCalledExactlyOnceWith(image, { isAvatar });
      expect(navigationSpy).toHaveBeenCalledTimes(0);
      await vi.runAllTimersAsync();
      expect(screen.queryByText(/failed to upload your (image|picture)/i)).toBeNull();
      expect(screen.queryByText(/upload failed/i)).toBeNull();
      vi.useRealTimers();
    });
  }
});
