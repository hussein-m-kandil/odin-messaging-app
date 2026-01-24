import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonDirective, ButtonLabel } from 'primeng/button';
import { Component, inject, input } from '@angular/core';
import { FloatLabel } from 'primeng/floatlabel';
import { InputText } from 'primeng/inputtext';
import { RouterLink } from '@angular/router';
import { getResErrMsg } from '../../utils';
import { Message } from 'primeng/message';
import { AuthData } from '../auth.types';
import { Auth } from '../auth';

@Component({
  selector: 'app-delete-form',
  imports: [
    ReactiveFormsModule,
    ButtonDirective,
    ButtonLabel,
    FloatLabel,
    RouterLink,
    InputText,
    Message,
  ],
  templateUrl: './delete-form.html',
  styles: ``,
})
export class DeleteForm {
  private readonly _auth = inject(Auth);

  protected readonly form = new FormGroup({
    username: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  readonly user = input.required<AuthData['user']>();

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
