import { render, screen, RenderComponentOptions } from '@testing-library/angular';
import { userEvent } from '@testing-library/user-event';
import { TestBed } from '@angular/core/testing';
import { Observable, Subscriber } from 'rxjs';
import { DeleteForm } from './delete-form';
import { AuthData } from '../auth.types';
import { Router } from '@angular/router';
import { Auth } from '../auth';
import { HttpErrorResponse } from '@angular/common/http';

const user = { id: crypto.randomUUID(), username: 'test_username' } as AuthData['user'];

const authMock = { user: vi.fn(), delete: vi.fn() };

const navigationSpy = vi.spyOn(Router.prototype, 'navigateByUrl');

const renderComponent = ({
  inputs,
  providers,
  ...options
}: RenderComponentOptions<DeleteForm> = {}) => {
  return render(DeleteForm, {
    providers: [{ provide: Auth, useValue: authMock }, ...(providers || [])],
    inputs: { user, ...inputs },
    autoDetectChanges: false,
    ...options,
  });
};

const getElements = () => ({
  form: screen.getByRole('form'),
  input: screen.getByRole('textbox'),
  cancelBtn: screen.getByRole('button', { name: /cancel/i }),
  submitBtn: screen.getByRole('button', { name: /delete/i }),
});

describe('DeleteForm', () => {
  afterEach(vi.resetAllMocks);

  it('should render delete form', async () => {
    await renderComponent();
    const { form, input } = getElements();
    expect(form).toBeVisible();
    expect(input).toBeVisible();
    expect(form).toHaveAccessibleName(`Deleting @${user.username}`);
    expect(input).toHaveAccessibleName('Type your username to confirm');
    expect(screen.getByText(/this action is irreversible/i)).toBeVisible();
    expect(screen.getByText(/do you really want to delete your profile\?/i)).toBeVisible();
  });

  it('should have a disabled submit button, and an enabled cancel button', async () => {
    await renderComponent();
    const { cancelBtn, submitBtn } = getElements();
    expect(cancelBtn).toBeVisible();
    expect(cancelBtn).toBeEnabled();
    expect(submitBtn).toBeVisible();
    expect(submitBtn).toBeDisabled();
  });

  it('should navigate on cancel', async () => {
    const actor = userEvent.setup();
    await renderComponent();
    const { cancelBtn } = getElements();
    await actor.click(cancelBtn);
    expect(navigationSpy).toHaveBeenCalledTimes(1);
    expect(authMock.delete).toHaveBeenCalledTimes(0);
  });

  it('should enable the submit button when the input has a value', async () => {
    const actor = userEvent.setup();
    await renderComponent();
    const { input, submitBtn } = getElements();
    await actor.type(input, ' ');
    expect(input).toHaveValue('');
    expect(input).toBeInvalid();
    expect(screen.getByText(/required/i)).toBeVisible();
    expect(submitBtn).toBeDisabled();
    await actor.type(input, 'x');
    expect(input).toHaveValue('x');
    expect(submitBtn).toBeEnabled();
    expect(screen.queryByText(/required/)).toBeNull();
    await actor.type(input, ' y z');
    expect(screen.queryByText(/required/)).toBeNull();
    expect(input).toHaveValue('x y z');
    expect(submitBtn).toBeEnabled();
    await actor.clear(input);
    expect(input).toHaveValue('');
    expect(input).toBeInvalid();
    expect(screen.getByText(/required/i)).toBeVisible();
    expect(submitBtn).toBeDisabled();
  });

  it('should not submit if the typed username is wrong', async () => {
    const actor = userEvent.setup();
    await renderComponent();
    const { input, submitBtn } = getElements();
    await actor.type(input, 'xyz');
    await actor.click(submitBtn);
    expect(input).toBeInvalid();
    expect(screen.getByText(/wrong/));
    expect(authMock.delete).toHaveBeenCalledTimes(0);
    expect(screen.queryByText(/required/)).toBeNull();
  });

  it('should submit if the typed username is correct', async () => {
    let sub!: Subscriber<''>;
    authMock.delete.mockImplementation(() => new Observable((s) => (sub = s)));
    const actor = userEvent.setup();
    await renderComponent();
    const { input, submitBtn, cancelBtn } = getElements();
    await actor.type(input, user.username);
    await actor.click(submitBtn);
    expect(input).toBeValid();
    expect(input).toBeDisabled();
    expect(submitBtn).toBeDisabled();
    expect(cancelBtn).toBeDisabled();
    expect(screen.queryByText(/wrong/)).toBeNull();
    sub.next('');
    sub.complete();
    TestBed.tick();
    expect(authMock.delete).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/required/)).toBeNull();
    expect(screen.queryByText(/wrong/)).toBeNull();
    expect(submitBtn).toBeDisabled();
    expect(cancelBtn).toBeEnabled();
    expect(input).toHaveValue('');
    expect(input).toBeEnabled();
    expect(input).toBeValid();
  });

  it('should not submit and display a closable global error', async () => {
    let sub!: Subscriber<''>;
    authMock.delete.mockImplementation(() => new Observable((s) => (sub = s)));
    const actor = userEvent.setup();
    await renderComponent();
    const { input, submitBtn, cancelBtn } = getElements();
    await actor.type(input, user.username);
    await actor.click(submitBtn);
    expect(input).toBeValid();
    expect(input).toBeDisabled();
    expect(submitBtn).toBeDisabled();
    expect(cancelBtn).toBeDisabled();
    expect(screen.queryByText(/wrong/)).toBeNull();
    sub.error(new HttpErrorResponse({ statusText: 'Internal server error', status: 500 }));
    TestBed.tick();
    expect(authMock.delete).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/required/)).toBeNull();
    expect(screen.queryByText(/wrong/)).toBeNull();
    expect(submitBtn).toBeDisabled();
    expect(cancelBtn).toBeEnabled();
    expect(input).toBeEnabled();
    expect(input).toBeValid();
    expect(input).toHaveValue(user.username);
    expect(screen.getByText(/deletion failed/i)).toBeVisible();
    await actor.click(screen.getByRole('button', { name: /close/i }));
    expect(screen.queryByText(/deletion failed/i)).toBeNull();
    expect(submitBtn).toBeEnabled();
  });
});
