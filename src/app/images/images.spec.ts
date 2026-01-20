import {
  TestRequest,
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import {
  HttpResponse,
  HttpEventType,
  provideHttpClient,
  HttpErrorResponse,
} from '@angular/common/http';
import { environment } from '../../environments';
import { TestBed } from '@angular/core/testing';
import { Images } from './images';
import { Auth } from '../auth';

const imagesUrl = `${environment.apiUrl}/images`;
const imageId = crypto.randomUUID();
const currentAvatarId = crypto.randomUUID();
const image = new File([], 'img.png', { type: 'image/png' });
const imagedata = { xPos: 7, yPos: 7, scale: 1.25, alt: 'Test img alt' };

const authMock = { user: vi.fn() };

const assertReqData = (req: TestRequest, isAvatar: boolean) => {
  const reqBody = req.request.body as FormData;
  expect(reqBody).toBeInstanceOf(FormData);
  expect(reqBody.get('alt')).toBe(imagedata.alt);
  expect(reqBody.get('isAvatar')).toBe(String(isAvatar));
  expect(reqBody.get('xPos')).toBe(String(imagedata.xPos));
  expect(reqBody.get('yPos')).toBe(String(imagedata.yPos));
  expect(reqBody.get('scale')).toBe(String(imagedata.scale));
};

const setup = () => {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: Auth, useValue: authMock },
    ],
  });
  const httpTesting = TestBed.inject(HttpTestingController);
  const service = TestBed.inject(Images);
  return { service, httpTesting };
};

describe('Images', () => {
  it('should upload an avatar image', () => {
    authMock.user.mockImplementationOnce(() => null);
    const { service, httpTesting } = setup();
    const isAvatar = true;
    let res, resErr;
    service
      .upload(image, { ...imagedata, isAvatar })
      .subscribe({ next: (r) => (res = r), error: (e) => (resErr = e) });
    const req = httpTesting.expectOne(
      { method: 'POST', url: imagesUrl },
      'Request to upload an avatar',
    );
    const resBody = { id: crypto.randomUUID() };
    req.flush(resBody);
    assertReqData(req, isAvatar);
    expect(resErr).toBeUndefined();
    expect(res).toBeInstanceOf(HttpResponse);
    expect(res).toHaveProperty('status', 200);
    expect(res).toHaveProperty('body', resBody);
    expect(res).toHaveProperty('type', HttpEventType.Response);
    httpTesting.verify();
  });

  it('should fail to upload due to a network error', () => {
    const { service, httpTesting } = setup();
    let res, resErr;
    service
      .upload(new File([], 'img.png', { type: 'image/png' }))
      .subscribe({ next: (r) => (res = r), error: (e) => (resErr = e) });
    const error = new ProgressEvent('Network error');
    httpTesting
      .expectOne({ method: 'POST', url: imagesUrl }, 'Request to upload an image')
      .error(error);
    expect(res).toHaveProperty('type', HttpEventType.Sent);
    expect(resErr).toBeInstanceOf(HttpErrorResponse);
    expect(resErr).toHaveProperty('error', error);
    expect(resErr).toHaveProperty('status', 0);
    httpTesting.verify();
  });

  it('should fail to upload due to a server error', () => {
    const { service, httpTesting } = setup();
    let res, resErr;
    service
      .upload(new File([], 'img.png', { type: 'image/png' }))
      .subscribe({ next: (r) => (res = r), error: (e) => (resErr = e) });
    const error = { error: { message: 'Failed' } };
    httpTesting
      .expectOne({ method: 'POST', url: imagesUrl }, 'Request to upload an image')
      .flush(error, { status: 500, statusText: 'Internal server error' });
    expect(res).toHaveProperty('type', HttpEventType.Sent);
    expect(resErr).toBeInstanceOf(HttpErrorResponse);
    expect(resErr).toHaveProperty('error', error);
    expect(resErr).toHaveProperty('status', 500);
    httpTesting.verify();
  });

  it('should upload a non-avatar image', () => {
    authMock.user.mockImplementationOnce(() => null);
    const { service, httpTesting } = setup();
    const isAvatar = false;
    let res, resErr;
    service
      .upload(image, { ...imagedata, isAvatar })
      .subscribe({ next: (r) => (res = r), error: (e) => (resErr = e) });
    const req = httpTesting.expectOne(
      { method: 'POST', url: imagesUrl },
      'Request to upload an image',
    );
    const resBody = { id: crypto.randomUUID() };
    req.flush(resBody);
    assertReqData(req, isAvatar);
    expect(resErr).toBeUndefined();
    expect(res).toBeInstanceOf(HttpResponse);
    expect(res).toHaveProperty('status', 200);
    expect(res).toHaveProperty('body', resBody);
    expect(res).toHaveProperty('type', HttpEventType.Response);
    httpTesting.verify();
  });

  it('should update the current user avatar image', () => {
    authMock.user.mockImplementationOnce(() => ({ avatar: { image: { id: currentAvatarId } } }));
    const { service, httpTesting } = setup();
    const isAvatar = true;
    let res, resErr;
    service
      .upload(image, { ...imagedata, isAvatar })
      .subscribe({ next: (r) => (res = r), error: (e) => (resErr = e) });
    const req = httpTesting.expectOne(
      { method: 'PUT', url: `${imagesUrl}/${currentAvatarId}` },
      'Request to update an avatar',
    );
    const resBody = { id: currentAvatarId };
    req.flush(resBody);
    assertReqData(req, isAvatar);
    expect(resErr).toBeUndefined();
    expect(res).toBeInstanceOf(HttpResponse);
    expect(res).toHaveProperty('status', 200);
    expect(res).toHaveProperty('body', resBody);
    expect(res).toHaveProperty('type', HttpEventType.Response);
    httpTesting.verify();
  });

  it('should not update the current user avatar image, instead, upload a new image', () => {
    authMock.user.mockImplementationOnce(() => ({ avatar: { image: { id: currentAvatarId } } }));
    const { service, httpTesting } = setup();
    const isAvatar = false;
    let res, resErr;
    service
      .upload(image, { ...imagedata, isAvatar })
      .subscribe({ next: (r) => (res = r), error: (e) => (resErr = e) });
    const req = httpTesting.expectOne(
      { method: 'POST', url: imagesUrl },
      'Request to upload an image',
    );
    const resBody = { id: currentAvatarId };
    req.flush(resBody);
    assertReqData(req, isAvatar);
    expect(resErr).toBeUndefined();
    expect(res).toBeInstanceOf(HttpResponse);
    expect(res).toHaveProperty('status', 200);
    expect(res).toHaveProperty('body', resBody);
    expect(res).toHaveProperty('type', HttpEventType.Response);
    httpTesting.verify();
  });

  it('should update the image with the given id', () => {
    authMock.user.mockImplementationOnce(() => ({ avatar: { image: { id: currentAvatarId } } }));
    const { service, httpTesting } = setup();
    const isAvatar = true;
    let res, resErr;
    service
      .upload(image, { ...imagedata, isAvatar }, imageId)
      .subscribe({ next: (r) => (res = r), error: (e) => (resErr = e) });
    const req = httpTesting.expectOne(
      { method: 'PUT', url: `${imagesUrl}/${imageId}` },
      'Request to update an image',
    );
    const resBody = { id: currentAvatarId };
    req.flush(resBody);
    assertReqData(req, isAvatar);
    expect(resErr).toBeUndefined();
    expect(res).toBeInstanceOf(HttpResponse);
    expect(res).toHaveProperty('status', 200);
    expect(res).toHaveProperty('body', resBody);
    expect(res).toHaveProperty('type', HttpEventType.Response);
    httpTesting.verify();
  });

  it('should delete an image', () => {
    const { service, httpTesting } = setup();
    let res, resErr;
    service.delete(imageId).subscribe({ next: (r) => (res = r), error: (e) => (resErr = e) });
    httpTesting
      .expectOne({ method: 'DELETE', url: `${imagesUrl}/${imageId}` }, 'Request to delete an image')
      .flush('', { status: 204, statusText: 'No Content' });
    expect(resErr).toBeUndefined();
    expect(res).toBe('');
    httpTesting.verify();
  });
});
