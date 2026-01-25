import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Component, inject, input } from '@angular/core';
import { FloatLabel } from 'primeng/floatlabel';
import { InputText } from 'primeng/inputtext';
import { getResErrMsg } from '../../utils';
import { Message } from 'primeng/message';
import { AuthData } from '../auth.types';
import { Router } from '@angular/router';
import { Button } from 'primeng/button';
import { Auth } from '../auth';

@Component({
  selector: 'app-delete-form',
  imports: [ReactiveFormsModule, FloatLabel, InputText, Message, Button],
  templateUrl: './delete-form.html',
  styles: ``,
})
export class DeleteForm {
  private readonly _router = inject(Router);
  private readonly _auth = inject(Auth);

  protected readonly form = new FormGroup({
    username: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  readonly user = input.required<AuthData['user']>();
  readonly redirectUrl = input.required<string>();

  protected redirect() {
    this._router.navigateByUrl(this.redirectUrl());
  }

  protected submit() {
    if (this.form.enabled && this.form.valid) {
      const user = this.user();
      if (this.form.controls.username.value !== user.username) {
        this.form.controls.username.setErrors({ mismatch: true });
        return;
      }
      this.form.markAllAsDirty();
      this.form.disable();
      this._auth.delete(user.id).subscribe({
        next: () => {
          this.form.enable();
          this.form.reset();
        },
        error: (res) => {
          this.form.enable();
          this.form.setErrors({ global: getResErrMsg(res) || 'Deletion Failed!' });
        },
      });
    }
  }
}
