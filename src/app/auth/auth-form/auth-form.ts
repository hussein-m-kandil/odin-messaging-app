import {
  FormGroup,
  Validators,
  ValidatorFn,
  FormControl,
  AbstractControl,
  ValidationErrors,
  ReactiveFormsModule,
} from '@angular/forms';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { FloatLabelModule } from 'primeng/floatlabel';
import { InputTextModule } from 'primeng/inputtext';
import { NgTemplateOutlet } from '@angular/common';
import { TextareaModule } from 'primeng/textarea';
import { DividerModule } from 'primeng/divider';
import { MessageModule } from 'primeng/message';
import { ButtonModule } from 'primeng/button';
import { MessageService } from 'primeng/api';
import { SignupData } from '../auth.types';
import { Auth } from '../auth';

export const passwordsMatchValidator: ValidatorFn = (
  control: AbstractControl
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
export class AuthForm {
  protected readonly passwordHidden = signal(true);
  protected readonly confirmHidden = signal(true);

  private readonly _activatedRoute = inject(ActivatedRoute);
  private readonly _toast = inject(MessageService);
  private readonly _router = inject(Router);
  private readonly _auth = inject(Auth);

  protected readonly signingIn = this._activatedRoute.snapshot.url.at(-1)?.path === 'signin';
  protected readonly formType = this.signingIn
    ? { verb: 'Sign', suffix: 'In', oppositeSuffix: 'Up' }
    : { verb: 'Sign', suffix: 'Up', oppositeSuffix: 'In' };

  protected readonly form = new FormGroup<{
    username: FormControl<string>;
    password: FormControl<string>;
    fullname?: FormControl<string>;
    confirm?: FormControl<string>;
    bio?: FormControl<string>;
  }>(
    {
      username: new FormControl('', { validators: [Validators.required], nonNullable: true }),
      password: new FormControl('', { validators: [Validators.required], nonNullable: true }),
      ...(this.signingIn
        ? {}
        : {
            fullname: new FormControl('', { validators: [Validators.required], nonNullable: true }),
            confirm: new FormControl('', { validators: [Validators.required], nonNullable: true }),
            bio: new FormControl('', { nonNullable: true }),
          }),
    },
    { validators: passwordsMatchValidator }
  );

  protected changeForm() {
    if (this.form.enabled) {
      const { queryParams } = this._router.routerState.snapshot.root;
      this._router.navigate(this.signingIn ? ['/signup'] : ['/signin'], { queryParams });
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
      const { username, password, ...formValues } = this.form.getRawValue();
      const authReq$ = this.signingIn
        ? this._auth.signIn({ username, password })
        : this._auth.signUp({ username, password, ...formValues } as SignupData);
      authReq$.pipe(takeUntilDestroyed(this._destroyRef)).subscribe({
        next: (user) => {
          this.form.reset();
          this._toast.add({
            severity: 'success',
            summary: `Welcome ${this.signingIn ? 'back' : ''}, ${user.username}`,
            detail: `You have signed-${this.formType.suffix.toLowerCase()} successfully.`,
          });
        },
        error: (data) => {
          this.form.enable();
          let message = 'Something went wrong; please try again later.';
          // 401 and 403 status codes are not handled, because this is an AUTH form!
          if (data instanceof HttpErrorResponse) {
            if (data.status === 400 && data.error) {
              const endSentence = (s: string) => `${s}${/\.|\?|!$/.test(s) ? '' : '.'}`;
              const { error } = data;
              if (error.error) {
                if (typeof error.error === 'string') message = error.error;
                else if (typeof error.error.message === 'string') message = error.error.message;
              } else if (typeof error.message === 'string') message = error.message;
              else if (typeof error === 'string') message = error;
              else if (Array.isArray(error) && !this.signingIn) {
                for (const field of error) {
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
            } else if (data.status === 0 && data.error instanceof ProgressEvent) {
              message = 'Please, check your internet connection and try again.';
            }
          }
          if (this.form.valid) this.form.setErrors({ global: message });
          this._toast.add({
            severity: 'error',
            summary: 'Submission failed',
            detail: `Failed to sign you ${this.formType.suffix.toLowerCase()}.`,
          });
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
}
