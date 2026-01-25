import { render, RenderComponentOptions, screen } from '@testing-library/angular';
import { userEvent } from '@testing-library/user-event';
import { Observable, Subscriber } from 'rxjs';
import { DeleteImage } from './delete-image';
import { Router } from '@angular/router';
import { Images } from '../images';
import { HttpErrorResponse } from '@angular/common/http';

const navigationSpy = vi.spyOn(Router.prototype, 'navigateByUrl');
const imagesMock = { delete: vi.fn() };

const imageId = crypto.randomUUID();
const redirectUrl = '/blah';

const renderComponent = ({
  inputs,
  providers,
  ...options
}: RenderComponentOptions<DeleteImage> = {}) => {
  return render(DeleteImage, {
    providers: [{ provide: Images, useValue: imagesMock }, ...(providers || [])],
    inputs: { imageId, redirectUrl, ...inputs },
    autoDetectChanges: false,
    ...options,
  });
};

const getElements = () => ({
  form: screen.getByRole('form'),
  cancelBtn: screen.getByRole('button', { name: /cancel/i }),
  submitBtn: screen.getByRole('button', { name: /delete/i }),
});

describe('DeleteImage', () => {
  afterEach(vi.resetAllMocks);

  for (const isAvatar of [true, false]) {
    const kind = isAvatar ? 'picture' : 'image';
    const options = { inputs: { isAvatar } };
    describe(kind, () => {
      it('should render a delete confirmation form', async () => {
        await renderComponent(options);
        const { form, cancelBtn, submitBtn } = getElements();
        expect(form).toBeVisible();
        expect(cancelBtn).toBeVisible();
        expect(cancelBtn).toBeEnabled();
        expect(submitBtn).toBeVisible();
        expect(submitBtn).toBeEnabled();
        expect(screen.getByText(/irreversible/i));
        expect(
          screen.getByRole('heading', { name: new RegExp(`delete ${kind}`, 'i') }),
        ).toBeVisible();
      });

      it('should cancel', async () => {
        const actor = userEvent.setup();
        const { detectChanges } = await renderComponent(options);
        const { cancelBtn, submitBtn } = getElements();
        await actor.click(cancelBtn);
        detectChanges();
        expect(cancelBtn).toBeEnabled();
        expect(submitBtn).toBeEnabled();
        expect(imagesMock.delete).toHaveBeenCalledTimes(0);
        expect(navigationSpy).toHaveBeenCalledExactlyOnceWith(redirectUrl);
      });

      it('should submit', async () => {
        let sub!: Subscriber<''>;
        imagesMock.delete.mockImplementation(() => new Observable((s) => (sub = s)));
        const actor = userEvent.setup();
        const { detectChanges } = await renderComponent(options);
        const { submitBtn, cancelBtn } = getElements();
        await actor.click(submitBtn);
        expect(cancelBtn).toBeDisabled();
        expect(submitBtn).toBeDisabled();
        sub.next('');
        sub.complete();
        detectChanges();
        expect(cancelBtn).toBeEnabled();
        expect(submitBtn).toBeEnabled();
        expect(imagesMock.delete).toHaveBeenCalledExactlyOnceWith(imageId);
        expect(navigationSpy).toHaveBeenCalledExactlyOnceWith(redirectUrl);
      });

      it('should fail to submit', async () => {
        let sub!: Subscriber<''>;
        imagesMock.delete.mockImplementation(() => new Observable((s) => (sub = s)));
        const actor = userEvent.setup();
        const { detectChanges } = await renderComponent(options);
        const { submitBtn, cancelBtn } = getElements();
        await actor.click(submitBtn);
        expect(cancelBtn).toBeDisabled();
        expect(submitBtn).toBeDisabled();
        sub.error(new HttpErrorResponse({ status: 500, statusText: 'Internal server error' }));
        detectChanges();
        expect(cancelBtn).toBeEnabled();
        expect(submitBtn).toBeEnabled();
        expect(navigationSpy).toHaveBeenCalledTimes(0);
        expect(imagesMock.delete).toHaveBeenCalledExactlyOnceWith(imageId);
        expect(screen.getByText(/deletion failed/i)).toBeVisible();
        await actor.click(screen.getByRole('button', { name: /close/i }));
        expect(screen.queryByText(/deletion failed/i)).toBeNull();
      });
    });
  }
});
