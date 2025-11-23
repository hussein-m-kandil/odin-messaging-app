import {
  HttpClient,
  withInterceptors,
  provideHttpClient,
  HttpInterceptorFn,
  HttpErrorResponse,
} from '@angular/common/http';
import {
  TestRequest,
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { inject, provideZonelessChangeDetection } from '@angular/core';
import { retryingInterceptor } from './retrying-interceptor';
import { TestBed } from '@angular/core/testing';

class ServiceMock {
  private readonly _http = inject(HttpClient);
  getData() {
    return this._http.get('/data');
  }
}

const setup = () => {
  const interceptor: HttpInterceptorFn = (req, next) => {
    return TestBed.runInInjectionContext(() => retryingInterceptor(req, next));
  };
  TestBed.configureTestingModule({
    providers: [
      ServiceMock,
      provideZonelessChangeDetection(),
      provideHttpClient(withInterceptors([interceptor])),
      provideHttpClientTesting(),
    ],
  });
  const httpTesting = TestBed.inject(HttpTestingController);
  const service = TestBed.inject(ServiceMock);
  const data$ = service.getData();
  return { httpTesting, interceptor, service, data$ };
};

describe('retryingInterceptor', () => {
  it('should retry 3 times on network error', async () => {
    const { httpTesting, data$ } = setup();
    let resError: unknown;
    let resData: unknown;
    data$.subscribe({ next: (d) => (resData = d), error: (e) => (resError = e) });
    for (let i = 0; i < 3; i++) {
      let req!: TestRequest;
      await vi.waitFor(
        () => (req = httpTesting.expectOne('/data', 'Request to get the data from `ServiceMock`'))
      );
      req.error(new ProgressEvent('network error!'));
      expect(req.request.method).toBe('GET');
      httpTesting.verify();
    }
    expect(resData).toBeUndefined();
    expect(resError).toBeInstanceOf(HttpErrorResponse);
    expect((resError as HttpErrorResponse).error).toBeInstanceOf(ProgressEvent);
  });

  it('should retry 3 times on a response status greater than or equal to 500', async () => {
    const { httpTesting, data$ } = setup();
    const payload = { message: 'something went wrong' };
    const statusCodes = [500, 501, 507];
    for (const status of statusCodes) {
      let resError: unknown;
      let resData: unknown;
      data$.subscribe({ next: (d) => (resData = d), error: (e) => (resError = e) });
      for (let i = 0; i < 3; i++) {
        expect(resData).toBeUndefined();
        expect(resError).toBeUndefined();
        let req!: TestRequest;
        await vi.waitFor(
          () => (req = httpTesting.expectOne('/data', 'Request to get the data from `ServiceMock`'))
        );
        req.flush(payload, { status, statusText: 'server error' });
        expect(req.request.method).toBe('GET');
        httpTesting.verify();
      }
      expect(resData).toBeUndefined();
      expect(resError).toBeInstanceOf(HttpErrorResponse);
      expect((resError as HttpErrorResponse).error).toStrictEqual(payload);
    }
  });

  it('should not retry on a response status in the range of 4xx', async () => {
    const { httpTesting, data$ } = setup();
    const payload = { message: 'something went wrong' };
    const statusCodes = [400, 401, 403, 404];
    for (const status of statusCodes) {
      let resError: unknown;
      let resData: unknown;
      data$.subscribe({ next: (d) => (resData = d), error: (e) => (resError = e) });
      const req = httpTesting.expectOne('/data', 'Request to get the data from `ServiceMock`');
      req.flush(payload, { status, statusText: 'client error' });
      expect(resData).toBeUndefined();
      expect(req.request.method).toBe('GET');
      expect(resError).toBeInstanceOf(HttpErrorResponse);
      expect((resError as HttpErrorResponse).error).toStrictEqual(payload);
      httpTesting.verify();
    }
  });

  it('should not retry on a response status in the range of 2xx', async () => {
    const { httpTesting, data$ } = setup();
    const payload = { message: 'important data' };
    const statusCodes = [200, 201, 204];
    for (const status of statusCodes) {
      let resError: unknown;
      let resData: unknown;
      data$.subscribe({ next: (d) => (resData = d), error: (e) => (resError = e) });
      const req = httpTesting.expectOne('/data', 'Request to get the data from `ServiceMock`');
      req.flush(payload, { status, statusText: 'ok' });
      expect(req.request.method).toBe('GET');
      expect(resData).toStrictEqual(payload);
      expect(resError).toBeUndefined();
      httpTesting.verify();
    }
  });
});
