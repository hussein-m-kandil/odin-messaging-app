import { inject, Injectable } from '@angular/core';
import { Image, NewImageData } from '../app.types';
import { HttpClient, HttpEventType } from '@angular/common/http';
import { environment } from '../../environments';
import { Auth } from '../auth';
import { tap } from 'rxjs';

const { apiUrl } = environment;

@Injectable({
  providedIn: 'root',
})
export class Images {
  private readonly _http = inject(HttpClient);
  private readonly _auth = inject(Auth);

  readonly baseUrl = `${apiUrl}/images`;

  upload(image: File, imagedata: NewImageData = {}, imageId?: Image['id']) {
    const currentAvatarId = this._auth.user()?.avatar?.image.id;
    const body = new FormData();
    body.set('image', image);
    Object.entries(imagedata).forEach(([k, v]) => body.set(k, String(v)));
    const [req, url] =
      imageId || (imagedata.isAvatar && currentAvatarId)
        ? [this._http.put.bind(this._http)<Image>, `${this.baseUrl}/${imageId || currentAvatarId}`]
        : [this._http.post.bind(this._http)<Image>, this.baseUrl];
    return req(url, body, { observe: 'events', reportProgress: true }).pipe(
      tap(
        (event) =>
          event.type === HttpEventType.Response &&
          imagedata.isAvatar &&
          event.body &&
          this._auth.updateUser({ avatar: { image: event.body } }),
      ),
    );
  }

  delete(imageId: Image['id'], isAvatar: boolean) {
    return this._http
      .delete<''>(`${this.baseUrl}/${imageId}`)
      .pipe(tap(() => isAvatar && this._auth.updateUser({ avatar: null })));
  }
}
