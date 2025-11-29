import { render, RenderComponentOptions, screen } from '@testing-library/angular';
import { HttpErrorResponse } from '@angular/common/http';
import { provideRouter, Router } from '@angular/router';
import { userEvent } from '@testing-library/user-event';
import { TestBed } from '@angular/core/testing';
import { AuthForm } from './auth-form';
import { of, throwError } from 'rxjs';
import { Auth } from '../auth';

const navigationSpy = vi.spyOn(Router.prototype, 'navigate');

const signIn = vi.fn(() => of(null));
const signUp = vi.fn(() => of(null));
const mockAuthService = vi.fn(() => ({ signIn, signUp }));

const renderComponent = async ({
  providers,
  ...options
}: RenderComponentOptions<AuthForm> = {}) => {
  const renderResult = await render(`<router-outlet />`, {
    providers: [
      provideRouter([
        { path: 'signin', component: AuthForm },
        { path: 'signup', component: AuthForm },
      ]),
      { provide: Auth, useValue: mockAuthService() },
      ...(providers || []),
    ],
    ...options,
  });
  if (options.initialRoute !== undefined) navigationSpy.mockReset();
  return renderResult;
};

const SIGNIN_ROUTE = 'signin';
const SIGNUP_ROUTE = 'signup';
const SIGNIN_REGEX = /sign ?in/i;
const SIGNUP_REGEX = /sign ?up/i;

describe('AuthForm', () => {
  afterEach(vi.resetAllMocks);

  it('should render sign-in form', async () => {
    await renderComponent({ initialRoute: SIGNIN_ROUTE });
    expect(screen.getByRole('form', { name: SIGNIN_REGEX })).toBeVisible();
    expect(screen.queryByRole('form', { name: SIGNUP_REGEX })).toBeNull();
  });

  it('should render sign-up form', async () => {
    await renderComponent({ initialRoute: SIGNUP_ROUTE });
    expect(screen.getByRole('form', { name: SIGNUP_REGEX })).toBeVisible();
    expect(screen.queryByRole('form', { name: SIGNIN_REGEX })).toBeNull();
  });

  it('should render sign-in fields', async () => {
    await renderComponent({ initialRoute: SIGNIN_ROUTE });
    const usernameInp = screen.getByLabelText(/username/i);
    const passwordInp = screen.getByLabelText(/password/i);
    const confirmInp = screen.queryByLabelText(/confirm/i);
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
    const confirmInp = screen.getByLabelText(/confirm/i);
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
    expect(bioInp).toHaveTextContent('');
    expect(bioInp).toBeInstanceOf(HTMLTextAreaElement);
  });

  it('should render a sign-in button and another button for switching to sign-up form', async () => {
    await renderComponent({ initialRoute: SIGNIN_ROUTE });
    const signinForm = screen.getByRole('form', { name: SIGNIN_REGEX });
    const signinBtn = screen.getByRole('button', { name: SIGNIN_REGEX });
    const signupBtn = screen.getByRole('button', { name: SIGNUP_REGEX });
    expect(signinBtn).toBeVisible();
    expect(signinForm.contains(signinBtn)).toBe(true);
    expect(signinBtn).toHaveAttribute('type', 'submit');
    expect(signupBtn).toBeVisible();
    expect(signinForm.contains(signupBtn)).toBe(false);
    expect(signupBtn).toHaveAttribute('type', 'button');
  });

  it('should render a sign-up button and another button for switching to sign-in form', async () => {
    await renderComponent({ initialRoute: SIGNUP_ROUTE });
    const signinForm = screen.getByRole('form', { name: SIGNUP_REGEX });
    const signupBtn = screen.getByRole('button', { name: SIGNUP_REGEX });
    const signinBtn = screen.getByRole('button', { name: SIGNIN_REGEX });
    expect(signupBtn).toBeVisible();
    expect(signinForm.contains(signupBtn)).toBe(true);
    expect(signupBtn).toHaveAttribute('type', 'submit');
    expect(signinBtn).toBeVisible();
    expect(signinForm.contains(signinBtn)).toBe(false);
    expect(signinBtn).toHaveAttribute('type', 'button');
  });

  it('should show-password button toggle the password value visibility in the sign-in form', async () => {
    const user = userEvent.setup();
    await renderComponent({ initialRoute: SIGNIN_ROUTE });
    expect(screen.getByLabelText(/password/i)).toHaveAttribute('type', 'password');
    await user.click(screen.getByRole('button', { name: /show .*password/i }));
    expect(screen.getByLabelText(/password/i)).toHaveAttribute('type', 'text');
    await user.click(screen.getByRole('button', { name: /hide .*password/i }));
    expect(screen.getByLabelText(/password/i)).toHaveAttribute('type', 'password');
  });

  it('should show-password button toggle the password value visibility in the sign-up form', async () => {
    const user = userEvent.setup();
    await renderComponent({ initialRoute: SIGNUP_ROUTE });
    expect(screen.getByLabelText(/password$/i)).toHaveAttribute('type', 'password');
    expect(screen.getByLabelText(/confirm/i)).toHaveAttribute('type', 'password');
    await user.click(screen.getByRole('button', { name: /show .*password$/i }));
    expect(screen.getByLabelText(/password$/i)).toHaveAttribute('type', 'text');
    expect(screen.getByLabelText(/confirm/i)).toHaveAttribute('type', 'password');
    await user.click(screen.getByRole('button', { name: /hide .*password$/i }));
    expect(screen.getByLabelText(/password$/i)).toHaveAttribute('type', 'password');
    expect(screen.getByLabelText(/confirm/i)).toHaveAttribute('type', 'password');
  });

  it('should navigate to the sign-up form after clicking the sign-up button', async () => {
    const user = userEvent.setup();
    await renderComponent({ initialRoute: SIGNIN_ROUTE });
    await user.click(screen.getByRole('button', { name: SIGNUP_REGEX }));
    TestBed.tick();
    const signinForm = screen.queryByRole('form', { name: SIGNIN_REGEX });
    const signinBtn = screen.getByRole('button', { name: SIGNIN_REGEX });
    const signupBtn = screen.getByRole('button', { name: SIGNUP_REGEX });
    const signupForm = screen.getByRole('form', { name: SIGNUP_REGEX });
    expect(navigationSpy).toHaveBeenCalledOnce();
    expect(signupForm).toBeVisible();
    expect(signinForm).toBeNull();
    expect(signinBtn).toBeVisible();
    expect(signupBtn).toBeVisible();
    expect(signupBtn).toHaveAttribute('type', 'submit');
    expect(signinBtn).toHaveAttribute('type', 'button');
  });

  it('should navigate to the sign-in form after clicking the sign-up button', async () => {
    const user = userEvent.setup();
    await renderComponent({ initialRoute: SIGNUP_ROUTE });
    await user.click(screen.getByRole('button', { name: SIGNIN_REGEX }));
    TestBed.tick();
    const signupForm = screen.queryByRole('form', { name: SIGNUP_REGEX });
    const signupBtn = screen.getByRole('button', { name: SIGNUP_REGEX });
    const signinBtn = screen.getByRole('button', { name: SIGNIN_REGEX });
    const signinForm = screen.getByRole('form', { name: SIGNIN_REGEX });
    expect(navigationSpy).toHaveBeenCalledOnce();
    expect(signinForm).toBeVisible();
    expect(signupForm).toBeNull();
    expect(signinBtn).toBeVisible();
    expect(signupBtn).toBeVisible();
    expect(signupBtn).toHaveAttribute('type', 'button');
    expect(signinBtn).toHaveAttribute('type', 'submit');
  });

  it('should not submit the sing-in form while all fields are empty', async () => {
    const user = userEvent.setup();
    await renderComponent({ initialRoute: SIGNIN_ROUTE });
    await user.click(screen.getByRole('button', { name: SIGNIN_REGEX }));
    expect(screen.getByRole('form', { name: SIGNIN_REGEX })).toBeVisible();
    expect(screen.getByLabelText(/username/i)).toBeInvalid();
    expect(screen.getByLabelText(/password/i)).toBeInvalid();
    expect(signIn).not.toHaveBeenCalled();
    expect(signUp).not.toHaveBeenCalled();
  });

  it('should not submit the sing-in form while it has an empty username field', async () => {
    const user = userEvent.setup();
    await renderComponent({ initialRoute: SIGNIN_ROUTE });
    await user.type(screen.getByLabelText(/password/i), 'pass@123');
    await user.click(screen.getByRole('button', { name: SIGNIN_REGEX }));
    expect(screen.getByRole('form', { name: SIGNIN_REGEX })).toBeVisible();
    expect(screen.getByLabelText(/username/i)).toBeInvalid();
    expect(screen.getByLabelText(/password/i)).toBeValid();
    expect(signIn).not.toHaveBeenCalled();
    expect(signUp).not.toHaveBeenCalled();
  });

  it('should not submit the sing-in form while it has an empty password field', async () => {
    const user = userEvent.setup();
    await renderComponent({ initialRoute: SIGNIN_ROUTE });
    await user.type(screen.getByLabelText(/username/i), 'test_user');
    await user.click(screen.getByRole('button', { name: SIGNIN_REGEX }));
    expect(screen.getByRole('form', { name: SIGNIN_REGEX })).toBeVisible();
    expect(screen.getByLabelText(/password/i)).toBeInvalid();
    expect(screen.getByLabelText(/username/i)).toBeValid();
    expect(signIn).not.toHaveBeenCalled();
    expect(signUp).not.toHaveBeenCalled();
  });

  it('should submit the sing-in form', async () => {
    const user = userEvent.setup();
    await renderComponent({ initialRoute: SIGNIN_ROUTE });
    await user.type(screen.getByLabelText(/username/i), 'test_user');
    await user.type(screen.getByLabelText(/password/i), 'pass@123');
    await user.click(screen.getByRole('button', { name: SIGNIN_REGEX }));
    expect(signIn).toHaveBeenCalledOnce();
    expect(signUp).not.toHaveBeenCalled();
  });

  it('should not submit the sing-up form while all the required fields are empty', async () => {
    const user = userEvent.setup();
    await renderComponent({ initialRoute: SIGNUP_ROUTE });
    await user.click(screen.getByRole('button', { name: SIGNUP_REGEX }));
    expect(screen.getByRole('form', { name: SIGNUP_REGEX })).toBeVisible();
    expect(screen.getByLabelText(/username/i)).toBeInvalid();
    expect(screen.getByLabelText(/password$/i)).toBeInvalid();
    expect(screen.getByLabelText(/fullname/i)).toBeInvalid();
    expect(screen.getByLabelText(/confirm/i)).toBeInvalid();
    expect(screen.getByLabelText(/bio/i)).toBeValid();
    expect(signIn).not.toHaveBeenCalled();
    expect(signUp).not.toHaveBeenCalled();
  });

  it('should not submit the sing-up form while it has an empty username field', async () => {
    const user = userEvent.setup();
    await renderComponent({ initialRoute: SIGNUP_ROUTE });
    await user.type(screen.getByLabelText(/fullname/i), 'Test User');
    await user.type(screen.getByLabelText(/password$/i), 'pass@123');
    await user.type(screen.getByLabelText(/confirm/i), 'pass@123');
    await user.click(screen.getByRole('button', { name: SIGNUP_REGEX }));
    expect(screen.getByRole('form', { name: SIGNUP_REGEX })).toBeVisible();
    expect(screen.getByLabelText(/username/i)).toBeInvalid();
    expect(screen.getByLabelText(/password$/i)).toBeValid();
    expect(screen.getByLabelText(/fullname/i)).toBeValid();
    expect(screen.getByLabelText(/confirm/i)).toBeValid();
    expect(screen.getByLabelText(/bio/i)).toBeValid();
    expect(signIn).not.toHaveBeenCalled();
    expect(signUp).not.toHaveBeenCalled();
  });

  it('should not submit the sing-up form while it has an empty password field and its confirmation', async () => {
    const user = userEvent.setup();
    await renderComponent({ initialRoute: SIGNUP_ROUTE });
    await user.type(screen.getByLabelText(/username/i), 'test_user');
    await user.type(screen.getByLabelText(/fullname/i), 'Test User');
    await user.click(screen.getByRole('button', { name: SIGNUP_REGEX }));
    expect(screen.getByRole('form', { name: SIGNUP_REGEX })).toBeVisible();
    expect(screen.getByLabelText(/password$/i)).toBeInvalid();
    expect(screen.getByLabelText(/confirm/i)).toBeInvalid();
    expect(screen.getByLabelText(/username/i)).toBeValid();
    expect(screen.getByLabelText(/fullname/i)).toBeValid();
    expect(screen.getByLabelText(/bio/i)).toBeValid();
    expect(signIn).not.toHaveBeenCalled();
    expect(signUp).not.toHaveBeenCalled();
  });

  it('should not submit the sing-up form while it has an empty fullname field', async () => {
    const user = userEvent.setup();
    await renderComponent({ initialRoute: SIGNUP_ROUTE });
    await user.type(screen.getByLabelText(/username/i), 'test_user');
    await user.type(screen.getByLabelText(/password$/i), 'pass@123');
    await user.type(screen.getByLabelText(/confirm/i), 'pass@123');
    await user.click(screen.getByRole('button', { name: SIGNUP_REGEX }));
    expect(screen.getByRole('form', { name: SIGNUP_REGEX })).toBeVisible();
    expect(screen.getByLabelText(/fullname/i)).toBeInvalid();
    expect(screen.getByLabelText(/username/i)).toBeValid();
    expect(screen.getByLabelText(/password$/i)).toBeValid();
    expect(screen.getByLabelText(/confirm/i)).toBeValid();
    expect(screen.getByLabelText(/bio/i)).toBeValid();
    expect(signIn).not.toHaveBeenCalled();
    expect(signUp).not.toHaveBeenCalled();
  });

  it('should not submit the sing-up form while the password and its confirmation are not matching', async () => {
    const user = userEvent.setup();
    await renderComponent({ initialRoute: SIGNUP_ROUTE });
    await user.type(screen.getByLabelText(/username/i), 'test_user');
    await user.type(screen.getByLabelText(/fullname/i), 'Test User');
    await user.type(screen.getByLabelText(/password$/i), 'pass@123');
    await user.type(screen.getByLabelText(/confirm/i), 'pasS@123');
    await user.click(screen.getByRole('button', { name: SIGNUP_REGEX }));
    expect(screen.getByRole('form', { name: SIGNUP_REGEX })).toBeVisible();
    expect(screen.getByLabelText(/confirm/i)).toBeInvalid();
    expect(screen.getByLabelText(/password$/i)).toBeValid();
    expect(screen.getByLabelText(/username/i)).toBeValid();
    expect(screen.getByLabelText(/fullname/i)).toBeValid();
    expect(screen.getByLabelText(/bio/i)).toBeValid();
    expect(signIn).not.toHaveBeenCalled();
    expect(signUp).not.toHaveBeenCalled();
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
    await user.type(screen.getByLabelText(/confirm/i), 'pass@123');
    await user.type(screen.getByLabelText(/bio/i), 'Testing...');
    await user.click(screen.getByRole('button', { name: SIGNUP_REGEX }));
    expect(signUp).toHaveBeenCalledOnce();
    expect(signIn).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/username/i)).toBeInvalid();
    expect(screen.getByLabelText(/fullname/i)).toBeInvalid();
    expect(screen.getByLabelText(/password$/i)).toBeInvalid();
    expect(screen.getByLabelText(/confirm/i)).toBeValid();
    expect(screen.getByLabelText(/bio/i)).toBeValid();
    expect(screen.getByText(new RegExp(usernameError))).toBeVisible();
    expect(screen.getByText(new RegExp(fullnameError))).toBeVisible();
    expect(screen.getByText(new RegExp(passwordError))).toBeVisible();
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
    await user.type(screen.getByLabelText(/confirm/i), 'pass@123');
    await user.type(screen.getByLabelText(/bio/i), 'Testing...');
    await user.click(screen.getByRole('button', { name: SIGNUP_REGEX }));
    expect(signUp).toHaveBeenCalledOnce();
    expect(signIn).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/password$/i)).toBeValid();
    expect(screen.getByLabelText(/fullname/i)).toBeValid();
    expect(screen.getByLabelText(/username/i)).toBeValid();
    expect(screen.getByLabelText(/confirm/i)).toBeValid();
    expect(screen.getByLabelText(/bio/i)).toBeValid();
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
    await user.type(screen.getByLabelText(/confirm/i), 'pass@123');
    await user.type(screen.getByLabelText(/bio/i), 'Testing...');
    await user.click(screen.getByRole('button', { name: SIGNUP_REGEX }));
    expect(signUp).toHaveBeenCalledOnce();
    expect(signIn).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/password$/i)).toBeValid();
    expect(screen.getByLabelText(/fullname/i)).toBeValid();
    expect(screen.getByLabelText(/username/i)).toBeValid();
    expect(screen.getByLabelText(/confirm/i)).toBeValid();
    expect(screen.getByLabelText(/bio/i)).toBeValid();
    expect(screen.getByText(new RegExp(message))).toBeVisible();
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
    await user.type(screen.getByLabelText(/confirm/i), 'pass@123');
    await user.type(screen.getByLabelText(/bio/i), 'Testing...');
    await user.click(screen.getByRole('button', { name: SIGNUP_REGEX }));
    expect(signUp).toHaveBeenCalledOnce();
    expect(signIn).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/password$/i)).toBeValid();
    expect(screen.getByLabelText(/fullname/i)).toBeValid();
    expect(screen.getByLabelText(/username/i)).toBeValid();
    expect(screen.getByLabelText(/confirm/i)).toBeValid();
    expect(screen.getByLabelText(/bio/i)).toBeValid();
    expect(screen.getByText(/something .*wrong/i)).toBeVisible();
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
    await user.type(screen.getByLabelText(/confirm/i), 'pass@123');
    await user.type(screen.getByLabelText(/bio/i), 'Testing...');
    await user.click(screen.getByRole('button', { name: SIGNUP_REGEX }));
    expect(signUp).toHaveBeenCalledOnce();
    expect(signIn).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/password$/i)).toBeValid();
    expect(screen.getByLabelText(/fullname/i)).toBeValid();
    expect(screen.getByLabelText(/username/i)).toBeValid();
    expect(screen.getByLabelText(/confirm/i)).toBeValid();
    expect(screen.getByLabelText(/bio/i)).toBeValid();
    expect(screen.getByText(/check your internet/i)).toBeVisible();
  });

  it('should submit and reset the sing-up form without an empty bio field', async () => {
    const user = userEvent.setup();
    await renderComponent({ initialRoute: SIGNUP_ROUTE });
    await user.type(screen.getByLabelText(/username/i), 'test_user');
    await user.type(screen.getByLabelText(/fullname/i), 'Test User');
    await user.type(screen.getByLabelText(/password$/i), 'pass@123');
    await user.type(screen.getByLabelText(/confirm/i), 'pass@123');
    await user.click(screen.getByRole('button', { name: SIGNUP_REGEX }));
    expect(signUp).toHaveBeenCalledOnce();
    expect(signIn).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/bio/i)).toBeValid();
    expect(screen.getByLabelText(/confirm/i)).toBeValid();
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
    await user.type(screen.getByLabelText(/confirm/i), 'pass@123');
    await user.type(screen.getByLabelText(/bio/i), 'Testing...');
    await user.click(screen.getByRole('button', { name: SIGNUP_REGEX }));
    expect(signUp).toHaveBeenCalledOnce();
    expect(signIn).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/bio/i)).toBeValid();
    expect(screen.getByLabelText(/confirm/i)).toBeValid();
    expect(screen.getByLabelText(/username/i)).toBeValid();
    expect(screen.getByLabelText(/fullname/i)).toBeValid();
    expect(screen.getByLabelText(/password$/i)).toBeValid();
  });
});
