import {
  FormGroup,
  Validators,
  ValidatorFn,
  FormControl,
  AbstractControl,
  ValidationErrors,
  ReactiveFormsModule,
} from '@angular/forms';
import { Component, DestroyRef, inject, input, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { FloatLabelModule } from 'primeng/floatlabel';
import { AuthData, SignupData } from '../auth.types';
import { InputTextModule } from 'primeng/inputtext';
import { NgTemplateOutlet } from '@angular/common';
import { TextareaModule } from 'primeng/textarea';
import { DividerModule } from 'primeng/divider';
import { MessageModule } from 'primeng/message';
import { ButtonModule } from 'primeng/button';
import { MessageService } from 'primeng/api';
import { getResErrMsg } from '../../utils';
import { Profile } from '../../app.types';
import { Observable } from 'rxjs';
import { Auth } from '../auth';

export const passwordsMatchValidator: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null => {
  const password = control.get('password');
  const confirm = control.get('confirm');
  if (password && confirm && password.value !== confirm.value) {
    confirm.setErrors({ validation: 'Passwords does not match' });
  } else if (confirm && confirm.hasError('validation')) {
    confirm.setErrors(confirm.dirty && !confirm.value ? { required: true } : null);
  }
  return null;
};

@Component({
  selector: 'app-auth-form',
  imports: [
    ReactiveFormsModule,
    NgTemplateOutlet,
    FloatLabelModule,
    InputTextModule,
    TextareaModule,
    DividerModule,
    MessageModule,
    ButtonModule,
  ],
  templateUrl: './auth-form.html',
})
export class AuthForm implements OnInit {
  protected readonly SIGN_IN_LABEL = 'Sign In';
  protected readonly SIGN_UP_LABEL = 'Sign Up';
  protected readonly EDIT_LABEL = 'Edit Profile';
  protected readonly passwordHidden = signal(true);
  protected readonly confirmHidden = signal(true);

  private readonly _activatedRoute = inject(ActivatedRoute);
  private readonly _toast = inject(MessageService);
  private readonly _router = inject(Router);
  private readonly _auth = inject(Auth);

  readonly profile = input<Profile>();

  private readonly _activatedPath = this._activatedRoute.snapshot.url.at(-1)?.path || '';

  protected readonly info = this._activatedPath.endsWith('signup')
    ? ({
        type: 'signup',
        label: this.SIGN_UP_LABEL,
        success: { summary: 'Welcome!', detail: 'You have signed-up successfully.' },
        error: { summary: 'Submission failed!', detail: 'Failed to sign you up.' },
      } as const)
    : this._activatedPath.endsWith('edit')
      ? ({
          type: 'edit',
          label: this.EDIT_LABEL,
          success: {
            summary: 'Profile edited!',
            detail: 'You have successfully edited your profile data.',
          },
          error: { summary: 'Submission failed!', detail: 'Failed to edit your profile data.' },
        } as const)
      : ({
          type: 'signin',
          label: this.SIGN_IN_LABEL,
          success: { summary: 'Welcome back!', detail: 'You have signed-in successfully.' },
          error: { summary: 'Submission failed!', detail: 'Failed to sign you in.' },
        } as const);

  protected readonly signingIn = this.info.type === 'signin';
  protected readonly signingUp = this.info.type === 'signup';
  protected readonly editing = this.info.type === 'edit';

  private _fieldValidators = this.editing ? [] : [Validators.required];
  protected readonly form = new FormGroup<{
    username: FormControl<string>;
    password: FormControl<string>;
    fullname?: FormControl<string>;
    confirm?: FormControl<string>;
    bio?: FormControl<string>;
  }>(
    {
      username: new FormControl('', { validators: this._fieldValidators, nonNullable: true }),
      password: new FormControl('', { validators: this._fieldValidators, nonNullable: true }),
      ...(this.signingUp || this.editing
        ? {
            fullname: new FormControl('', { validators: this._fieldValidators, nonNullable: true }),
            confirm: new FormControl('', { validators: this._fieldValidators, nonNullable: true }),
            bio: new FormControl('', { nonNullable: true }),
          }
        : {}),
    },
    { validators: passwordsMatchValidator },
  );

  protected navigate(url: string[]) {
    if (this.form.enabled) {
      const { queryParams } = this._router.routerState.snapshot.root;
      this._router.navigate(url, { queryParams, relativeTo: this._activatedRoute });
    }
  }

  private readonly _destroyRef = inject(DestroyRef);

  protected submit() {
    this.form.markAllAsTouched();
    this.form.markAllAsDirty();
    this.form.markAsTouched();
    this.form.markAsDirty();
    this.form.setErrors(null);
    if (this.form.enabled && this.form.valid) {
      this.form.disable();
      const profile = this.profile();
      const formValues = this.form.getRawValue();
      let req$: Observable<AuthData['user']>;
      if (this.signingUp) {
        req$ = this._auth.signUp(formValues as SignupData);
      } else if (this.editing && profile) {
        req$ = this._auth.edit(profile.user.id, formValues);
      } else if (this.signingIn) {
        req$ = this._auth.signIn(formValues);
      } else {
        return;
      }
      req$.pipe(takeUntilDestroyed(this._destroyRef)).subscribe({
        next: () => {
          this.form.enable();
          this._toast.add({ ...this.info.success, severity: 'success' });
          if (this.editing) this.navigate(['..']);
        },
        error: (res) => {
          this.form.enable();
          const defaultMessage = 'Something went wrong; please try again later.';
          let message = getResErrMsg(res) || defaultMessage;
          if (message === defaultMessage && res instanceof HttpErrorResponse) {
            // 401 and 403 status codes are not handled, because this is an AUTH form!
            if (res.status === 400 && res.error) {
              const endSentence = (s: string) => `${s}${/\.|\?|!$/.test(s) ? '' : '.'}`;
              if (Array.isArray(res.error) && !this.signingIn) {
                for (const field of res.error) {
                  if (Array.isArray(field.path) && typeof field.message === 'string') {
                    const controlNames = Object.keys(this.form.controls);
                    for (const controlName of controlNames) {
                      const control = this.form.get(controlName);
                      if (field.path.includes(controlName) && control) {
                        control.setErrors({ validation: endSentence(field.message) });
                      }
                    }
                  }
                }
              }
              message = endSentence(message);
            }
          }
          if (this.form.valid) this.form.setErrors({ global: message });
          this._toast.add({ ...this.info.error, severity: 'error' });
        },
      });
    }
  }

  protected signInAsGuest() {
    if (this.form.enabled) {
      this.form.disable();
      this._auth
        .signInAsGuest()
        .pipe(takeUntilDestroyed(this._destroyRef))
        .subscribe({
          next: () => {
            this.form.enable();
            const detail = 'You have signed-is as a guest successfully.';
            this._toast.add({ summary: 'Welcome!', severity: 'success', detail });
          },
          error: (res) => {
            this.form.enable();
            const detail = getResErrMsg(res) || 'Failed to sign you as a guest.';
            if (this.form.valid) this.form.setErrors({ global: detail });
            this._toast.add({ summary: 'Guest sign-in failed!', severity: 'error', detail });
          },
        });
    }
  }

  protected isInvalid(controlName: string) {
    const control = this.form.get(controlName);
    return control && control.invalid && control.dirty;
  }

  protected getError(name: string) {
    const control = this.form.get(name);
    if (control) {
      const required = control.getError('required') as string;
      if (required) return `${name[0].toUpperCase()}${name.slice(1)} is required.`;
      const validationError = control.getError('validation') as string;
      if (validationError) return validationError;
    }
    return '';
  }

  protected togglePasswordVisibility() {
    this.passwordHidden.update((hidden) => !hidden);
  }

  protected toggleConfirmVisibility() {
    this.confirmHidden.update((hidden) => !hidden);
  }

  ngOnInit() {
    if (this.editing) {
      const profile = this.profile();
      if (profile) {
        this.form.controls.username.setValue(profile.user.username);
        this.form.controls.fullname?.setValue(profile.user.fullname);
        this.form.controls.bio?.setValue(profile.user.bio);
      }
    }
  }
}
