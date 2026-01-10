import { render, RenderComponentOptions, screen } from '@testing-library/angular';
import { HttpErrorResponse } from '@angular/common/http';
import { provideRouter, Router, withComponentInputBinding } from '@angular/router';
import { userEvent } from '@testing-library/user-event';
import { TestBed } from '@angular/core/testing';
import { MessageService } from 'primeng/api';
import { AuthForm } from './auth-form';
import { of, throwError } from 'rxjs';
import { Auth } from '../auth';

const user = {
  id: crypto.randomUUID(),
  username: 'test_user',
  fullname: 'Test User',
  bio: 'Test bio.',
};
const profile = { id: crypto.randomUUID(), user };

const SIGNIN_ROUTE = 'signin';
const SIGNIN_REGEX = /sign ?in/i;
const SIGNUP_ROUTE = 'signup';
const SIGNUP_REGEX = /sign ?up/i;
const EDIT_ROUTE = 'edit';
const EDIT_REGEX = /edit profile/i;

const signIn = vi.fn(() => of(user));
const signUp = vi.fn(() => of(user));
const edit = vi.fn(() => of(user));
const mockAuthService = vi.fn(() => ({ signIn, signUp, edit }));
const navigationSpy = vi.spyOn(Router.prototype, 'navigate');

const renderComponent = async ({
  providers,
  ...options
}: RenderComponentOptions<AuthForm> = {}) => {
  const renderResult = await render(`<router-outlet />`, {
    providers: [
      MessageService,
      provideRouter(
        [
          { path: 'signin', component: AuthForm },
          { path: 'signup', component: AuthForm },
          { path: 'edit', component: AuthForm, resolve: { profile: () => profile } },
        ],
        withComponentInputBinding()
      ),
      { provide: Auth, useValue: mockAuthService() },
      ...(providers || []),
    ],
    ...options,
  });
  if (options.initialRoute !== undefined) navigationSpy.mockReset();
  return renderResult;
};

describe('AuthForm', () => {
  afterEach(vi.resetAllMocks);

  it('should render sign-in form', async () => {
    await renderComponent({ initialRoute: SIGNIN_ROUTE });
    expect(screen.getByRole('form', { name: SIGNIN_REGEX })).toBeVisible();
    expect(screen.queryByRole('form', { name: SIGNUP_REGEX })).toBeNull();
    expect(screen.queryByRole('form', { name: EDIT_REGEX })).toBeNull();
  });

  it('should render sign-up form', async () => {
    await renderComponent({ initialRoute: SIGNUP_ROUTE });
    expect(screen.getByRole('form', { name: SIGNUP_REGEX })).toBeVisible();
    expect(screen.queryByRole('form', { name: SIGNIN_REGEX })).toBeNull();
    expect(screen.queryByRole('form', { name: EDIT_REGEX })).toBeNull();
  });

  it('should render edit-profile form', async () => {
    await renderComponent({ initialRoute: EDIT_ROUTE });
    expect(screen.getByRole('form', { name: EDIT_REGEX })).toBeVisible();
    expect(screen.queryByRole('form', { name: SIGNUP_REGEX })).toBeNull();
    expect(screen.queryByRole('form', { name: SIGNIN_REGEX })).toBeNull();
  });

  it('should render sign-in fields', async () => {
    await renderComponent({ initialRoute: SIGNIN_ROUTE });
    const usernameInp = screen.getByLabelText(/username/i);
    const passwordInp = screen.getByLabelText(/password$/i);
    const confirmInp = screen.queryByLabelText(/confirmation$/i);
    const fullnameInp = screen.queryByLabelText(/fullname/i);
    const bioInp = screen.queryByLabelText(/bio/i);
    expect(usernameInp).toBeVisible();
    expect(usernameInp).toBeValid();
    expect(usernameInp).toHaveValue('');
    expect(usernameInp).toBeInstanceOf(HTMLInputElement);
    expect(usernameInp).toHaveAttribute('type', 'text');
    expect(passwordInp).toBeVisible();
    expect(passwordInp).toBeValid();
    expect(passwordInp).toHaveValue('');
    expect(passwordInp).toBeInstanceOf(HTMLInputElement);
    expect(passwordInp).toHaveAttribute('type', 'password');
    expect(fullnameInp).toBeNull();
    expect(confirmInp).toBeNull();
    expect(bioInp).toBeNull();
  });

  it('should render sign-up fields', async () => {
    await renderComponent({ initialRoute: SIGNUP_ROUTE });
    const usernameInp = screen.getByLabelText(/username/i);
    const passwordInp = screen.getByLabelText(/password$/i);
    const confirmInp = screen.getByLabelText(/confirmation$/i);
    const fullnameInp = screen.getByLabelText(/fullname/i);
    const bioInp = screen.getByLabelText(/bio/i);
    expect(usernameInp).toBeVisible();
    expect(usernameInp).toBeValid();
    expect(usernameInp).toHaveValue('');
    expect(usernameInp).toBeInstanceOf(HTMLInputElement);
    expect(usernameInp).toHaveAttribute('type', 'text');
    expect(passwordInp).toBeVisible();
    expect(passwordInp).toBeValid();
    expect(passwordInp).toHaveValue('');
    expect(passwordInp).toBeInstanceOf(HTMLInputElement);
    expect(passwordInp).toHaveAttribute('type', 'password');
    expect(confirmInp).toBeVisible();
    expect(confirmInp).toBeValid();
    expect(confirmInp).toHaveValue('');
    expect(confirmInp).toBeInstanceOf(HTMLInputElement);
    expect(confirmInp).toHaveAttribute('type', 'password');
    expect(fullnameInp).toBeVisible();
    expect(fullnameInp).toBeValid();
    expect(fullnameInp).toHaveValue('');
    expect(fullnameInp).toBeInstanceOf(HTMLInputElement);
    expect(fullnameInp).toHaveAttribute('type', 'text');
    expect(bioInp).toBeVisible();
    expect(bioInp).toBeValid();
    expect(bioInp).toHaveValue('');
    expect(bioInp).toBeInstanceOf(HTMLTextAreaElement);
  });

  it('should render edit-profile fields', async () => {
    await renderComponent({ initialRoute: EDIT_ROUTE });
    const usernameInp = screen.getByLabelText(/username/i);
    const passwordInp = screen.getByLabelText(/password$/i);
    const confirmInp = screen.getByLabelText(/confirmation$/i);
    const fullnameInp = screen.getByLabelText(/fullname/i);
    const bioInp = screen.getByLabelText(/bio/i);
    expect(usernameInp).toBeVisible();
    expect(usernameInp).toBeValid();
    expect(usernameInp).toHaveValue(profile.user.username);
    expect(usernameInp).toBeInstanceOf(HTMLInputElement);
    expect(usernameInp).toHaveAttribute('type', 'text');
    expect(passwordInp).toBeVisible();
    expect(passwordInp).toBeValid();
    expect(passwordInp).toHaveValue('');
    expect(passwordInp).toBeInstanceOf(HTMLInputElement);
    expect(passwordInp).toHaveAttribute('type', 'password');
    expect(confirmInp).toBeVisible();
    expect(confirmInp).toBeValid();
    expect(confirmInp).toHaveValue('');
    expect(confirmInp).toBeInstanceOf(HTMLInputElement);
    expect(confirmInp).toHaveAttribute('type', 'password');
    expect(fullnameInp).toBeVisible();
    expect(fullnameInp).toBeValid();
    expect(fullnameInp).toHaveValue(profile.user.fullname);
    expect(fullnameInp).toBeInstanceOf(HTMLInputElement);
    expect(fullnameInp).toHaveAttribute('type', 'text');
    expect(bioInp).toBeVisible();
    expect(bioInp).toBeValid();
    expect(bioInp).toHaveValue(profile.user.bio);
    expect(bioInp).toBeInstanceOf(HTMLTextAreaElement);
  });

  it('should render a submit button and a sign-up switcher', async () => {
    await renderComponent({ initialRoute: SIGNIN_ROUTE });
    const signinForm = screen.getByRole('form', { name: SIGNIN_REGEX });
    const signupBtn = screen.getByRole('button', { name: SIGNUP_REGEX });
    const submitBtn = screen.getByRole('button', { name: /submit/i });
    const cancelBtn = screen.queryByRole('button', { name: /cancel/i });
    const signinBtn = screen.queryByRole('button', { name: SIGNIN_REGEX });
    expect(submitBtn).toBeVisible();
    expect(signinForm.contains(submitBtn)).toBe(true);
    expect(submitBtn).toHaveAttribute('type', 'submit');
    expect(cancelBtn).toBeNull();
    expect(signinBtn).toBeNull();
    expect(signupBtn).toBeVisible();
    expect(signinForm.contains(signupBtn)).toBe(false);
    expect(signupBtn).toHaveAttribute('type', 'button');
  });

  it('should render a submit button and a sign-in switcher', async () => {
    await renderComponent({ initialRoute: SIGNUP_ROUTE });
    const signinForm = screen.getByRole('form', { name: SIGNUP_REGEX });
    const signinBtn = screen.getByRole('button', { name: SIGNIN_REGEX });
    const submitBtn = screen.getByRole('button', { name: /submit/i });
    const cancelBtn = screen.queryByRole('button', { name: /cancel/i });
    const signupBtn = screen.queryByRole('button', { name: SIGNUP_REGEX });
    expect(submitBtn).toBeVisible();
    expect(signinForm.contains(submitBtn)).toBe(true);
    expect(submitBtn).toHaveAttribute('type', 'submit');
    expect(cancelBtn).toBeNull();
    expect(signupBtn).toBeNull();
    expect(signinBtn).toBeVisible();
    expect(signinForm.contains(signinBtn)).toBe(false);
    expect(signinBtn).toHaveAttribute('type', 'button');
  });

  it('should render a submit button and a cancel button', async () => {
    await renderComponent({ initialRoute: EDIT_ROUTE });
    const editForm = screen.getByRole('form', { name: EDIT_REGEX });
    const cancelBtn = screen.getByRole('button', { name: /cancel/i });
    const submitBtn = screen.getByRole('button', { name: /submit/i });
    const signinBtn = screen.queryByRole('button', { name: SIGNIN_REGEX });
    const signupBtn = screen.queryByRole('button', { name: SIGNUP_REGEX });
    expect(submitBtn).toBeVisible();
    expect(editForm.contains(submitBtn)).toBe(true);
    expect(submitBtn).toHaveAttribute('type', 'submit');
    expect(signinBtn).toBeNull();
    expect(signupBtn).toBeNull();
    expect(cancelBtn).toBeVisible();
    expect(editForm.contains(cancelBtn)).toBe(false);
    expect(cancelBtn).toHaveAttribute('type', 'button');
  });

  it('should navigate to the sign-up form after clicking the sign-up switcher', async () => {
    const user = userEvent.setup();
    await renderComponent({ initialRoute: SIGNIN_ROUTE });
    await user.click(screen.getByRole('button', { name: SIGNUP_REGEX }));
    TestBed.tick();
    const signinForm = screen.queryByRole('form', { name: SIGNIN_REGEX });
    const signupForm = screen.getByRole('form', { name: SIGNUP_REGEX });
    const submitBtn = screen.getByRole('button', { name: /submit/i });
    expect(navigationSpy).toHaveBeenCalledOnce();
    expect(signupForm).toBeVisible();
    expect(signinForm).toBeNull();
    expect(submitBtn).toBeVisible();
    expect(submitBtn).toHaveAttribute('type', 'submit');
  });

  it('should navigate to the sign-in form after clicking the sign-up switcher', async () => {
    const user = userEvent.setup();
    await renderComponent({ initialRoute: SIGNUP_ROUTE });
    await user.click(screen.getByRole('button', { name: SIGNIN_REGEX }));
    TestBed.tick();
    const signupForm = screen.queryByRole('form', { name: SIGNUP_REGEX });
    const submitBtn = screen.getByRole('button', { name: /submit/i });
    const signinForm = screen.getByRole('form', { name: SIGNIN_REGEX });
    expect(navigationSpy).toHaveBeenCalledOnce();
    expect(signinForm).toBeVisible();
    expect(signupForm).toBeNull();
    expect(submitBtn).toBeVisible();
    expect(submitBtn).toHaveAttribute('type', 'submit');
  });

  it('should navigate back after clicking the cancel button', async () => {
    const user = userEvent.setup();
    const { container } = await renderComponent({ initialRoute: EDIT_ROUTE });
    await user.click(screen.getByRole('button', { name: /cancel/i }));
    TestBed.tick();
    container.querySelectorAll('router-outlet').forEach((element) => element.remove());
    expect(navigationSpy).toHaveBeenCalledOnce();
    expect(container).toBeEmptyDOMElement();
  });

  it('should show-password button toggle the password value visibility in the sign-in form', async () => {
    const user = userEvent.setup();
    await renderComponent({ initialRoute: SIGNIN_ROUTE });
    expect(screen.getByLabelText(/password$/i)).toHaveAttribute('type', 'password');
    await user.click(screen.getByRole('button', { name: /show/i }));
    expect(screen.getByLabelText(/password$/i)).toHaveAttribute('type', 'text');
    await user.click(screen.getByRole('button', { name: /hide/i }));
    expect(screen.getByLabelText(/password$/i)).toHaveAttribute('type', 'password');
  });

  it('should show-password button toggle the password value visibility in the sign-up form', async () => {
    const user = userEvent.setup();
    await renderComponent({ initialRoute: SIGNUP_ROUTE });
    expect(screen.getByLabelText(/password$/i)).toHaveAttribute('type', 'password');
    expect(screen.getByLabelText(/confirmation$/i)).toHaveAttribute('type', 'password');
    const showButtons = screen.getAllByRole('button', { name: /show/i });
    for (const showBtn of showButtons) await user.click(showBtn);
    expect(screen.getByLabelText(/password$/i)).toHaveAttribute('type', 'text');
    expect(screen.getByLabelText(/confirmation$/i)).toHaveAttribute('type', 'text');
    const hideButtons = screen.getAllByRole('button', { name: /hide/i });
    for (const hideBtn of hideButtons) await user.click(hideBtn);
    expect(screen.getByLabelText(/password$/i)).toHaveAttribute('type', 'password');
    expect(screen.getByLabelText(/confirmation$/i)).toHaveAttribute('type', 'password');
  });

  it('should show-password button toggle the password value visibility in the edit-profile form', async () => {
    const user = userEvent.setup();
    await renderComponent({ initialRoute: EDIT_ROUTE });
    expect(screen.getByLabelText(/password$/i)).toHaveAttribute('type', 'password');
    expect(screen.getByLabelText(/confirmation$/i)).toHaveAttribute('type', 'password');
    const showButtons = screen.getAllByRole('button', { name: /show/i });
    for (const showBtn of showButtons) await user.click(showBtn);
    expect(screen.getByLabelText(/password$/i)).toHaveAttribute('type', 'text');
    expect(screen.getByLabelText(/confirmation$/i)).toHaveAttribute('type', 'text');
    const hideButtons = screen.getAllByRole('button', { name: /hide/i });
    for (const hideBtn of hideButtons) await user.click(hideBtn);
    expect(screen.getByLabelText(/password$/i)).toHaveAttribute('type', 'password');
    expect(screen.getByLabelText(/confirmation$/i)).toHaveAttribute('type', 'password');
  });

  it('should not submit the sing-in form while all fields are empty', async () => {
    const user = userEvent.setup();
    await renderComponent({ initialRoute: SIGNIN_ROUTE });
    await user.click(screen.getByRole('button', { name: /submit/i }));
    expect(screen.getByRole('form', { name: SIGNIN_REGEX })).toBeVisible();
    expect(screen.getByLabelText(/username/i)).toBeInvalid();
    expect(screen.getByLabelText(/password$/i)).toBeInvalid();
    expect(signIn).not.toHaveBeenCalled();
    expect(signUp).not.toHaveBeenCalled();
    expect(edit).not.toHaveBeenCalled();
  });

  it('should not submit the sing-in form while it has an empty username field', async () => {
    const user = userEvent.setup();
    await renderComponent({ initialRoute: SIGNIN_ROUTE });
    await user.type(screen.getByLabelText(/password$/i), 'pass@123');
    await user.click(screen.getByRole('button', { name: /submit/i }));
    expect(screen.getByRole('form', { name: SIGNIN_REGEX })).toBeVisible();
    expect(screen.getByLabelText(/username/i)).toBeInvalid();
    expect(screen.getByLabelText(/password$/i)).toBeValid();
    expect(signIn).not.toHaveBeenCalled();
    expect(signUp).not.toHaveBeenCalled();
    expect(edit).not.toHaveBeenCalled();
  });

  it('should not submit the sing-in form while it has an empty password field', async () => {
    const user = userEvent.setup();
    await renderComponent({ initialRoute: SIGNIN_ROUTE });
    await user.type(screen.getByLabelText(/username/i), 'test_user');
    await user.click(screen.getByRole('button', { name: /submit/i }));
    expect(screen.getByRole('form', { name: SIGNIN_REGEX })).toBeVisible();
    expect(screen.getByLabelText(/password$/i)).toBeInvalid();
    expect(screen.getByLabelText(/username/i)).toBeValid();
    expect(signIn).not.toHaveBeenCalled();
    expect(signUp).not.toHaveBeenCalled();
    expect(edit).not.toHaveBeenCalled();
  });

  it('should submit the sing-in form', async () => {
    const user = userEvent.setup();
    await renderComponent({ initialRoute: SIGNIN_ROUTE });
    await user.type(screen.getByLabelText(/username/i), 'test_user');
    await user.type(screen.getByLabelText(/password$/i), 'pass@123');
    await user.click(screen.getByRole('button', { name: /submit/i }));
    expect(signIn).toHaveBeenCalledOnce();
    expect(signUp).not.toHaveBeenCalled();
    expect(edit).not.toHaveBeenCalled();
  });

  it('should not submit the sing-up form while all the required fields are empty', async () => {
    const user = userEvent.setup();
    await renderComponent({ initialRoute: SIGNUP_ROUTE });
    await user.click(screen.getByRole('button', { name: /submit/i }));
    expect(screen.getByRole('form', { name: SIGNUP_REGEX })).toBeVisible();
    expect(screen.getByLabelText(/username/i)).toBeInvalid();
    expect(screen.getByLabelText(/password$/i)).toBeInvalid();
    expect(screen.getByLabelText(/fullname/i)).toBeInvalid();
    expect(screen.getByLabelText(/confirmation$/i)).toBeInvalid();
    expect(screen.getByLabelText(/bio/i)).toBeValid();
    expect(signIn).not.toHaveBeenCalled();
    expect(signUp).not.toHaveBeenCalled();
    expect(edit).not.toHaveBeenCalled();
  });

  it('should not submit the sing-up form while it has an empty username field', async () => {
    const user = userEvent.setup();
    await renderComponent({ initialRoute: SIGNUP_ROUTE });
    await user.type(screen.getByLabelText(/fullname/i), 'Test User');
    await user.type(screen.getByLabelText(/password$/i), 'pass@123');
    await user.type(screen.getByLabelText(/confirmation$/i), 'pass@123');
    await user.click(screen.getByRole('button', { name: /submit/i }));
    expect(screen.getByRole('form', { name: SIGNUP_REGEX })).toBeVisible();
    expect(screen.getByLabelText(/username/i)).toBeInvalid();
    expect(screen.getByLabelText(/password$/i)).toBeValid();
    expect(screen.getByLabelText(/fullname/i)).toBeValid();
    expect(screen.getByLabelText(/confirmation$/i)).toBeValid();
    expect(screen.getByLabelText(/bio/i)).toBeValid();
    expect(signIn).not.toHaveBeenCalled();
    expect(signUp).not.toHaveBeenCalled();
    expect(edit).not.toHaveBeenCalled();
  });

  it('should not submit the sing-up form while it has an empty password field and its confirmation', async () => {
    const user = userEvent.setup();
    await renderComponent({ initialRoute: SIGNUP_ROUTE });
    await user.type(screen.getByLabelText(/username/i), 'test_user');
    await user.type(screen.getByLabelText(/fullname/i), 'Test User');
    await user.click(screen.getByRole('button', { name: /submit/i }));
    expect(screen.getByRole('form', { name: SIGNUP_REGEX })).toBeVisible();
    expect(screen.getByLabelText(/password$/i)).toBeInvalid();
    expect(screen.getByLabelText(/confirmation$/i)).toBeInvalid();
    expect(screen.getByLabelText(/username/i)).toBeValid();
    expect(screen.getByLabelText(/fullname/i)).toBeValid();
    expect(screen.getByLabelText(/bio/i)).toBeValid();
    expect(signIn).not.toHaveBeenCalled();
    expect(signUp).not.toHaveBeenCalled();
    expect(edit).not.toHaveBeenCalled();
  });

  it('should not submit the sing-up form while it has an empty fullname field', async () => {
    const user = userEvent.setup();
    await renderComponent({ initialRoute: SIGNUP_ROUTE });
    await user.type(screen.getByLabelText(/username/i), 'test_user');
    await user.type(screen.getByLabelText(/password$/i), 'pass@123');
    await user.type(screen.getByLabelText(/confirmation$/i), 'pass@123');
    await user.click(screen.getByRole('button', { name: /submit/i }));
    expect(screen.getByRole('form', { name: SIGNUP_REGEX })).toBeVisible();
    expect(screen.getByLabelText(/fullname/i)).toBeInvalid();
    expect(screen.getByLabelText(/username/i)).toBeValid();
    expect(screen.getByLabelText(/password$/i)).toBeValid();
    expect(screen.getByLabelText(/confirmation$/i)).toBeValid();
    expect(screen.getByLabelText(/bio/i)).toBeValid();
    expect(signIn).not.toHaveBeenCalled();
    expect(signUp).not.toHaveBeenCalled();
    expect(edit).not.toHaveBeenCalled();
  });

  it('should not submit the sing-up form while the password and its confirmation are not matching', async () => {
    const user = userEvent.setup();
    await renderComponent({ initialRoute: SIGNUP_ROUTE });
    await user.type(screen.getByLabelText(/username/i), 'test_user');
    await user.type(screen.getByLabelText(/fullname/i), 'Test User');
    await user.type(screen.getByLabelText(/password$/i), 'pass@123');
    await user.type(screen.getByLabelText(/confirmation$/i), 'pasS@123');
    await user.click(screen.getByRole('button', { name: /submit/i }));
    expect(screen.getByRole('form', { name: SIGNUP_REGEX })).toBeVisible();
    expect(screen.getByLabelText(/confirmation$/i)).toBeInvalid();
    expect(screen.getByLabelText(/password$/i)).toBeValid();
    expect(screen.getByLabelText(/username/i)).toBeValid();
    expect(screen.getByLabelText(/fullname/i)).toBeValid();
    expect(screen.getByLabelText(/bio/i)).toBeValid();
    expect(signIn).not.toHaveBeenCalled();
    expect(signUp).not.toHaveBeenCalled();
    expect(edit).not.toHaveBeenCalled();
  });

  it('should not submit the edit-profile form while the password and its confirmation are not matching', async () => {
    const user = userEvent.setup();
    await renderComponent({ initialRoute: EDIT_ROUTE });
    await user.type(screen.getByLabelText(/username/i), 'test_user');
    await user.type(screen.getByLabelText(/fullname/i), 'Test User');
    await user.type(screen.getByLabelText(/password$/i), 'pass@123');
    await user.type(screen.getByLabelText(/confirmation$/i), 'pasS@123');
    await user.click(screen.getByRole('button', { name: /submit/i }));
    expect(screen.getByRole('form', { name: EDIT_REGEX })).toBeVisible();
    expect(screen.getByLabelText(/confirmation$/i)).toBeInvalid();
    expect(screen.getByLabelText(/password$/i)).toBeValid();
    expect(screen.getByLabelText(/username/i)).toBeValid();
    expect(screen.getByLabelText(/fullname/i)).toBeValid();
    expect(screen.getByLabelText(/bio/i)).toBeValid();
    expect(signIn).not.toHaveBeenCalled();
    expect(signUp).not.toHaveBeenCalled();
    expect(edit).not.toHaveBeenCalled();
  });

  it('should display the error returned from the server after submitting the sign-in form', async () => {
    const message = 'Test error';
    const error = { error: message };
    const res = new HttpErrorResponse({ status: 400, statusText: 'Client error', error });
    signIn.mockImplementationOnce(() => throwError(() => res));
    const user = userEvent.setup();
    await renderComponent({ initialRoute: SIGNIN_ROUTE });
    await user.type(screen.getByLabelText(/username/i), 'test_user');
    await user.type(screen.getByLabelText(/password$/i), 'pass@123');
    await user.click(screen.getByRole('button', { name: /submit/i }));
    expect(edit).not.toHaveBeenCalled();
    expect(signUp).not.toHaveBeenCalled();
    expect(signIn).toHaveBeenCalledOnce();
    expect(screen.getByLabelText(/username/i)).toBeValid();
    expect(screen.getByLabelText(/password$/i)).toBeValid();
    expect(screen.getByText(new RegExp(message))).toBeVisible();
  });

  it('should display the error returned from the server after submitting the sign-up form', async () => {
    const message = 'Test error';
    const error = { error: message };
    const res = new HttpErrorResponse({ status: 400, statusText: 'Client error', error });
    signUp.mockImplementationOnce(() => throwError(() => res));
    const user = userEvent.setup();
    await renderComponent({ initialRoute: SIGNUP_ROUTE });
    await user.type(screen.getByLabelText(/username/i), 'test_user');
    await user.type(screen.getByLabelText(/fullname/i), 'Test User');
    await user.type(screen.getByLabelText(/password$/i), 'pass@123');
    await user.type(screen.getByLabelText(/confirmation$/i), 'pass@123');
    await user.type(screen.getByLabelText(/bio/i), 'Testing...');
    await user.click(screen.getByRole('button', { name: /submit/i }));
    expect(signUp).toHaveBeenCalledOnce();
    expect(signIn).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/password$/i)).toBeValid();
    expect(screen.getByLabelText(/fullname/i)).toBeValid();
    expect(screen.getByLabelText(/username/i)).toBeValid();
    expect(screen.getByLabelText(/confirmation$/i)).toBeValid();
    expect(screen.getByLabelText(/bio/i)).toBeValid();
    expect(screen.getByText(new RegExp(message))).toBeVisible();
  });

  it('should display the error returned from the server after submitting the edit-profile form', async () => {
    const message = 'Test error';
    const error = { error: message };
    const res = new HttpErrorResponse({ status: 400, statusText: 'Client error', error });
    edit.mockImplementationOnce(() => throwError(() => res));
    const user = userEvent.setup();
    await renderComponent({ initialRoute: EDIT_ROUTE });
    await user.type(screen.getByLabelText(/username/i), 'test_user');
    await user.type(screen.getByLabelText(/fullname/i), 'Test User');
    await user.type(screen.getByLabelText(/password$/i), 'pass@123');
    await user.type(screen.getByLabelText(/confirmation$/i), 'pass@123');
    await user.type(screen.getByLabelText(/bio/i), 'Testing...');
    await user.click(screen.getByRole('button', { name: /submit/i }));
    expect(edit).toHaveBeenCalled();
    expect(signIn).not.toHaveBeenCalled();
    expect(signUp).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/password$/i)).toBeValid();
    expect(screen.getByLabelText(/fullname/i)).toBeValid();
    expect(screen.getByLabelText(/username/i)).toBeValid();
    expect(screen.getByLabelText(/confirmation$/i)).toBeValid();
    expect(screen.getByLabelText(/bio/i)).toBeValid();
    expect(screen.getByText(new RegExp(message))).toBeVisible();
  });

  it('should display the error message returned from the server after submitting the sign-in form', async () => {
    const message = 'Test error';
    const error = { error: { message } };
    const res = new HttpErrorResponse({ status: 400, statusText: 'Client error', error });
    signIn.mockImplementationOnce(() => throwError(() => res));
    const user = userEvent.setup();
    await renderComponent({ initialRoute: SIGNIN_ROUTE });
    await user.type(screen.getByLabelText(/username/i), 'test_user');
    await user.type(screen.getByLabelText(/password$/i), 'pass@123');
    await user.click(screen.getByRole('button', { name: /submit/i }));
    expect(signIn).toHaveBeenCalled();
    expect(edit).not.toHaveBeenCalled();
    expect(signUp).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/username/i)).toBeValid();
    expect(screen.getByLabelText(/password$/i)).toBeValid();
    expect(screen.getByText(new RegExp(message))).toBeVisible();
  });

  it('should display the error message returned from the server after submitting the sign-up form', async () => {
    const message = 'Test error';
    const error = { error: { message } };
    const res = new HttpErrorResponse({ status: 400, statusText: 'Client error', error });
    signUp.mockImplementationOnce(() => throwError(() => res));
    const user = userEvent.setup();
    await renderComponent({ initialRoute: SIGNUP_ROUTE });
    await user.type(screen.getByLabelText(/username/i), 'test_user');
    await user.type(screen.getByLabelText(/fullname/i), 'Test User');
    await user.type(screen.getByLabelText(/password$/i), 'pass@123');
    await user.type(screen.getByLabelText(/confirmation$/i), 'pass@123');
    await user.type(screen.getByLabelText(/bio/i), 'Testing...');
    await user.click(screen.getByRole('button', { name: /submit/i }));
    expect(signUp).toHaveBeenCalledOnce();
    expect(signIn).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/password$/i)).toBeValid();
    expect(screen.getByLabelText(/fullname/i)).toBeValid();
    expect(screen.getByLabelText(/username/i)).toBeValid();
    expect(screen.getByLabelText(/confirmation$/i)).toBeValid();
    expect(screen.getByLabelText(/bio/i)).toBeValid();
    expect(screen.getByText(new RegExp(message))).toBeVisible();
  });

  it('should display the error message returned from the server after submitting the edit-profile form', async () => {
    const message = 'Test error';
    const error = { error: { message } };
    const res = new HttpErrorResponse({ status: 400, statusText: 'Client error', error });
    edit.mockImplementationOnce(() => throwError(() => res));
    const user = userEvent.setup();
    await renderComponent({ initialRoute: EDIT_ROUTE });
    await user.type(screen.getByLabelText(/username/i), 'test_user');
    await user.type(screen.getByLabelText(/fullname/i), 'Test User');
    await user.type(screen.getByLabelText(/password$/i), 'pass@123');
    await user.type(screen.getByLabelText(/confirmation$/i), 'pass@123');
    await user.type(screen.getByLabelText(/bio/i), 'Testing...');
    await user.click(screen.getByRole('button', { name: /submit/i }));
    expect(edit).toHaveBeenCalledOnce();
    expect(signIn).not.toHaveBeenCalled();
    expect(signUp).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/password$/i)).toBeValid();
    expect(screen.getByLabelText(/fullname/i)).toBeValid();
    expect(screen.getByLabelText(/username/i)).toBeValid();
    expect(screen.getByLabelText(/confirmation$/i)).toBeValid();
    expect(screen.getByLabelText(/bio/i)).toBeValid();
    expect(screen.getByText(new RegExp(message))).toBeVisible();
  });

  it('should display a server error message after submitting the sign-in form', async () => {
    const error = new ProgressEvent('Test network error');
    const res = new HttpErrorResponse({ status: 500, statusText: 'Test server error', error });
    signIn.mockImplementationOnce(() => throwError(() => res));
    const user = userEvent.setup();
    await renderComponent({ initialRoute: SIGNIN_ROUTE });
    await user.type(screen.getByLabelText(/username/i), 'test_user');
    await user.type(screen.getByLabelText(/password$/i), 'pass@123');
    await user.click(screen.getByRole('button', { name: /submit/i }));
    expect(signIn).toHaveBeenCalled();
    expect(edit).not.toHaveBeenCalled();
    expect(signUp).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/username/i)).toBeValid();
    expect(screen.getByLabelText(/password$/i)).toBeValid();
    expect(screen.getByText(/something .*wrong/i)).toBeVisible();
  });

  it('should display a server error message after submitting the sign-up form', async () => {
    const error = new ProgressEvent('Test network error');
    const res = new HttpErrorResponse({ status: 500, statusText: 'Test server error', error });
    signUp.mockImplementationOnce(() => throwError(() => res));
    const user = userEvent.setup();
    await renderComponent({ initialRoute: SIGNUP_ROUTE });
    await user.type(screen.getByLabelText(/username/i), 'test_user');
    await user.type(screen.getByLabelText(/fullname/i), 'Test User');
    await user.type(screen.getByLabelText(/password$/i), 'pass@123');
    await user.type(screen.getByLabelText(/confirmation$/i), 'pass@123');
    await user.type(screen.getByLabelText(/bio/i), 'Testing...');
    await user.click(screen.getByRole('button', { name: /submit/i }));
    expect(signUp).toHaveBeenCalledOnce();
    expect(signIn).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/password$/i)).toBeValid();
    expect(screen.getByLabelText(/fullname/i)).toBeValid();
    expect(screen.getByLabelText(/username/i)).toBeValid();
    expect(screen.getByLabelText(/confirmation$/i)).toBeValid();
    expect(screen.getByLabelText(/bio/i)).toBeValid();
    expect(screen.getByText(/something .*wrong/i)).toBeVisible();
  });

  it('should display a server error message after submitting the edit-profile form', async () => {
    const error = new ProgressEvent('Test network error');
    const res = new HttpErrorResponse({ status: 500, statusText: 'Test server error', error });
    edit.mockImplementationOnce(() => throwError(() => res));
    const user = userEvent.setup();
    await renderComponent({ initialRoute: EDIT_ROUTE });
    await user.type(screen.getByLabelText(/username/i), 'test_user');
    await user.type(screen.getByLabelText(/fullname/i), 'Test User');
    await user.type(screen.getByLabelText(/password$/i), 'pass@123');
    await user.type(screen.getByLabelText(/confirmation$/i), 'pass@123');
    await user.type(screen.getByLabelText(/bio/i), 'Testing...');
    await user.click(screen.getByRole('button', { name: /submit/i }));
    expect(edit).toHaveBeenCalled();
    expect(signIn).not.toHaveBeenCalled();
    expect(signUp).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/password$/i)).toBeValid();
    expect(screen.getByLabelText(/fullname/i)).toBeValid();
    expect(screen.getByLabelText(/username/i)).toBeValid();
    expect(screen.getByLabelText(/confirmation$/i)).toBeValid();
    expect(screen.getByLabelText(/bio/i)).toBeValid();
    expect(screen.getByText(/something .*wrong/i)).toBeVisible();
  });

  it('should display a network error message after submitting the sign-in form', async () => {
    const error = new ProgressEvent('Test network error');
    const res = new HttpErrorResponse({ status: 0, statusText: 'Test no status', error });
    signIn.mockImplementationOnce(() => throwError(() => res));
    const user = userEvent.setup();
    await renderComponent({ initialRoute: SIGNIN_ROUTE });
    await user.type(screen.getByLabelText(/username/i), 'test_user');
    await user.type(screen.getByLabelText(/password$/i), 'pass@123');
    await user.click(screen.getByRole('button', { name: /submit/i }));
    expect(edit).not.toHaveBeenCalled();
    expect(signUp).not.toHaveBeenCalled();
    expect(signIn).toHaveBeenCalledOnce();
    expect(screen.getByLabelText(/username/i)).toBeValid();
    expect(screen.getByLabelText(/password$/i)).toBeValid();
    expect(screen.getByText(/check your internet/i)).toBeVisible();
  });

  it('should display a network error message after submitting the sign-up form', async () => {
    const error = new ProgressEvent('Test network error');
    const res = new HttpErrorResponse({ status: 0, statusText: 'Test no status', error });
    signUp.mockImplementationOnce(() => throwError(() => res));
    const user = userEvent.setup();
    await renderComponent({ initialRoute: SIGNUP_ROUTE });
    await user.type(screen.getByLabelText(/username/i), 'test_user');
    await user.type(screen.getByLabelText(/fullname/i), 'Test User');
    await user.type(screen.getByLabelText(/password$/i), 'pass@123');
    await user.type(screen.getByLabelText(/confirmation$/i), 'pass@123');
    await user.type(screen.getByLabelText(/bio/i), 'Testing...');
    await user.click(screen.getByRole('button', { name: /submit/i }));
    expect(signUp).toHaveBeenCalledOnce();
    expect(signIn).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/password$/i)).toBeValid();
    expect(screen.getByLabelText(/fullname/i)).toBeValid();
    expect(screen.getByLabelText(/username/i)).toBeValid();
    expect(screen.getByLabelText(/confirmation$/i)).toBeValid();
    expect(screen.getByLabelText(/bio/i)).toBeValid();
    expect(screen.getByText(/check your internet/i)).toBeVisible();
  });

  it('should display a network error message after submitting the edit-profile form', async () => {
    const error = new ProgressEvent('Test network error');
    const res = new HttpErrorResponse({ status: 0, statusText: 'Test no status', error });
    edit.mockImplementationOnce(() => throwError(() => res));
    const user = userEvent.setup();
    await renderComponent({ initialRoute: EDIT_ROUTE });
    await user.type(screen.getByLabelText(/username/i), 'test_user');
    await user.type(screen.getByLabelText(/fullname/i), 'Test User');
    await user.type(screen.getByLabelText(/password$/i), 'pass@123');
    await user.type(screen.getByLabelText(/confirmation$/i), 'pass@123');
    await user.type(screen.getByLabelText(/bio/i), 'Testing...');
    await user.click(screen.getByRole('button', { name: /submit/i }));
    expect(edit).toHaveBeenCalled();
    expect(signIn).not.toHaveBeenCalled();
    expect(signUp).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/password$/i)).toBeValid();
    expect(screen.getByLabelText(/fullname/i)).toBeValid();
    expect(screen.getByLabelText(/username/i)).toBeValid();
    expect(screen.getByLabelText(/confirmation$/i)).toBeValid();
    expect(screen.getByLabelText(/bio/i)).toBeValid();
    expect(screen.getByText(/check your internet/i)).toBeVisible();
  });

  it('should display the validation errors returned form the server after submitting the sign-up form', async () => {
    const usernameError = 'Test username Error';
    const fullnameError = 'Test fullname Error';
    const passwordError = 'Test password Error';
    const error = [
      { path: ['username'], message: usernameError },
      { path: ['fullname'], message: fullnameError },
      { path: ['password'], message: passwordError },
    ];
    const res = new HttpErrorResponse({ status: 400, statusText: 'Client error', error });
    signUp.mockImplementationOnce(() => throwError(() => res));
    const user = userEvent.setup();
    await renderComponent({ initialRoute: SIGNUP_ROUTE });
    await user.type(screen.getByLabelText(/username/i), 'test_user');
    await user.type(screen.getByLabelText(/fullname/i), 'Test User');
    await user.type(screen.getByLabelText(/password$/i), 'pass@123');
    await user.type(screen.getByLabelText(/confirmation$/i), 'pass@123');
    await user.type(screen.getByLabelText(/bio/i), 'Testing...');
    await user.click(screen.getByRole('button', { name: /submit/i }));
    expect(edit).not.toHaveBeenCalled();
    expect(signIn).not.toHaveBeenCalled();
    expect(signUp).toHaveBeenCalledOnce();
    expect(screen.getByLabelText(/username/i)).toBeInvalid();
    expect(screen.getByLabelText(/fullname/i)).toBeInvalid();
    expect(screen.getByLabelText(/password$/i)).toBeInvalid();
    expect(screen.getByLabelText(/confirmation$/i)).toBeValid();
    expect(screen.getByLabelText(/bio/i)).toBeValid();
    expect(screen.getByText(new RegExp(usernameError))).toBeVisible();
    expect(screen.getByText(new RegExp(fullnameError))).toBeVisible();
    expect(screen.getByText(new RegExp(passwordError))).toBeVisible();
  });

  it('should display the validation errors returned form the server after submitting the edit-profile form', async () => {
    const usernameError = 'Test username Error';
    const fullnameError = 'Test fullname Error';
    const passwordError = 'Test password Error';
    const error = [
      { path: ['username'], message: usernameError },
      { path: ['fullname'], message: fullnameError },
      { path: ['password'], message: passwordError },
    ];
    const res = new HttpErrorResponse({ status: 400, statusText: 'Client error', error });
    edit.mockImplementationOnce(() => throwError(() => res));
    const user = userEvent.setup();
    await renderComponent({ initialRoute: EDIT_ROUTE });
    await user.type(screen.getByLabelText(/username/i), 'test_user');
    await user.type(screen.getByLabelText(/fullname/i), 'Test User');
    await user.type(screen.getByLabelText(/password$/i), 'pass@123');
    await user.type(screen.getByLabelText(/confirmation$/i), 'pass@123');
    await user.type(screen.getByLabelText(/bio/i), 'Testing...');
    await user.click(screen.getByRole('button', { name: /submit/i }));
    expect(edit).toHaveBeenCalled();
    expect(signIn).not.toHaveBeenCalled();
    expect(signUp).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/username/i)).toBeInvalid();
    expect(screen.getByLabelText(/fullname/i)).toBeInvalid();
    expect(screen.getByLabelText(/password$/i)).toBeInvalid();
    expect(screen.getByLabelText(/confirmation$/i)).toBeValid();
    expect(screen.getByLabelText(/bio/i)).toBeValid();
    expect(screen.getByText(new RegExp(usernameError))).toBeVisible();
    expect(screen.getByText(new RegExp(fullnameError))).toBeVisible();
    expect(screen.getByText(new RegExp(passwordError))).toBeVisible();
  });

  it('should submit and reset the sing-up form without an empty bio field', async () => {
    const user = userEvent.setup();
    await renderComponent({ initialRoute: SIGNUP_ROUTE });
    await user.type(screen.getByLabelText(/username/i), 'test_user');
    await user.type(screen.getByLabelText(/fullname/i), 'Test User');
    await user.type(screen.getByLabelText(/password$/i), 'pass@123');
    await user.type(screen.getByLabelText(/confirmation$/i), 'pass@123');
    await user.click(screen.getByRole('button', { name: /submit/i }));
    expect(signUp).toHaveBeenCalledOnce();
    expect(signIn).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/bio/i)).toBeValid();
    expect(screen.getByLabelText(/confirmation$/i)).toBeValid();
    expect(screen.getByLabelText(/username/i)).toBeValid();
    expect(screen.getByLabelText(/fullname/i)).toBeValid();
    expect(screen.getByLabelText(/password$/i)).toBeValid();
  });

  it('should submit and reset the sing-up form with a filled bio field', async () => {
    const user = userEvent.setup();
    await renderComponent({ initialRoute: SIGNUP_ROUTE });
    await user.type(screen.getByLabelText(/username/i), 'test_user');
    await user.type(screen.getByLabelText(/fullname/i), 'Test User');
    await user.type(screen.getByLabelText(/password$/i), 'pass@123');
    await user.type(screen.getByLabelText(/confirmation$/i), 'pass@123');
    await user.type(screen.getByLabelText(/bio/i), 'Testing...');
    await user.click(screen.getByRole('button', { name: /submit/i }));
    expect(signUp).toHaveBeenCalledOnce();
    expect(signIn).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/bio/i)).toBeValid();
    expect(screen.getByLabelText(/confirmation$/i)).toBeValid();
    expect(screen.getByLabelText(/username/i)).toBeValid();
    expect(screen.getByLabelText(/fullname/i)).toBeValid();
    expect(screen.getByLabelText(/password$/i)).toBeValid();
  });

  it('should submit the edit-profile form', async () => {
    const user = userEvent.setup();
    const { container } = await renderComponent({ initialRoute: EDIT_ROUTE });
    await user.type(screen.getByLabelText(/username/i), ' x');
    await user.type(screen.getByLabelText(/password$/i), ' x');
    await user.type(screen.getByLabelText(/fullname/i), ' x');
    await user.type(screen.getByLabelText(/confirmation$/i), ' x');
    await user.type(screen.getByLabelText(/bio/i), ' x');
    await user.click(screen.getByRole('button', { name: /submit/i }));
    TestBed.tick();
    container.querySelectorAll('router-outlet').forEach((element) => element.remove());
    expect(navigationSpy).toHaveBeenCalledOnce();
    expect(container).toBeEmptyDOMElement();
    expect(signUp).not.toHaveBeenCalled();
    expect(signIn).not.toHaveBeenCalled();
    expect(edit).toHaveBeenCalled();
  });

  it('should submit the edit-profile form even if all the fields are empty', async () => {
    const user = userEvent.setup();
    const { container } = await renderComponent({ initialRoute: EDIT_ROUTE });
    await user.clear(screen.getByLabelText(/username/i));
    await user.clear(screen.getByLabelText(/password$/i));
    await user.clear(screen.getByLabelText(/fullname/i));
    await user.clear(screen.getByLabelText(/confirmation$/i));
    await user.clear(screen.getByLabelText(/bio/i));
    await user.click(screen.getByRole('button', { name: /submit/i }));
    TestBed.tick();
    container.querySelectorAll('router-outlet').forEach((element) => element.remove());
    expect(navigationSpy).toHaveBeenCalledOnce();
    expect(container).toBeEmptyDOMElement();
    expect(signUp).not.toHaveBeenCalled();
    expect(signIn).not.toHaveBeenCalled();
    expect(edit).toHaveBeenCalled();
  });

  it('should submit the edit-profile form even if the form is never touched', async () => {
    const user = userEvent.setup();
    const { container } = await renderComponent({ initialRoute: EDIT_ROUTE });
    await user.click(screen.getByRole('button', { name: /submit/i }));
    TestBed.tick();
    container.querySelectorAll('router-outlet').forEach((element) => element.remove());
    expect(navigationSpy).toHaveBeenCalledOnce();
    expect(container).toBeEmptyDOMElement();
    expect(signUp).not.toHaveBeenCalled();
    expect(signIn).not.toHaveBeenCalled();
    expect(edit).toHaveBeenCalled();
  });
});
