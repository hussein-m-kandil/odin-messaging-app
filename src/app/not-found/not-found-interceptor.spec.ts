import { HttpClient, withInterceptors, provideHttpClient, HttpRequest } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { notFoundInterceptor } from './not-found-interceptor';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { Component } from '@angular/core';

const navigationSpy = vi.spyOn(Router.prototype, 'navigate');

const httpMethods = ['GET', 'PUT', 'POST', 'PATCH', 'DELETE', 'OPTIONS'] as const;
const url = '/';

@Component({ selector: 'app-test-component-mock', template: '<div>Not Found!</div>' })
class TestComponentMock {}

const setup = () => {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: '**', component: TestComponentMock }]),
      provideHttpClient(withInterceptors([notFoundInterceptor])),
      provideHttpClientTesting(),
    ],
  });
  const httpTesting = TestBed.inject(HttpTestingController);
  const http = TestBed.inject(HttpClient);
  return { http, httpTesting };
};

describe('notFoundInterceptor', () => {
  it('should navigate to the not-found route on a response with 404 status', async () => {
    const { http, httpTesting } = setup();
    let reqCompleted = false;
    const completeReq = () => setTimeout(() => (reqCompleted = true), 0);
    for (const method of httpMethods) {
      http
        .request(new HttpRequest(method, url, null))
        .subscribe({ next: completeReq, error: completeReq });
      const req = httpTesting.expectOne({ method, url });
      req.flush('Failed', { status: 404, statusText: 'Not found' });
      httpTesting.verify();
      await vi.waitUntil(() => reqCompleted);
      expect(navigationSpy).toHaveBeenCalledExactlyOnceWith(['/not-found'], { replaceUrl: true });
      navigationSpy.mockClear();
    }
  });

  it('should not navigate to the not-found route on any response status other than 404', async () => {
    const testResData = [
      { status: 500, statusText: 'Internal server error' },
      { status: 401, statusText: 'Unauthorized' },
      { status: 400, statusText: 'Bad request' },
      { status: 204, statusText: 'No content' },
      { status: 201, statusText: 'Created' },
      { status: 200, statusText: 'OK' },
    ];
    const { http, httpTesting } = setup();
    let reqCompleted = false;
    const completeReq = () => setTimeout(() => (reqCompleted = true), 0);
    for (const method of httpMethods) {
      for (const resData of testResData) {
        http
          .request(new HttpRequest(method, url, null))
          .subscribe({ next: completeReq, error: completeReq });
        const req = httpTesting.expectOne({ method, url });
        req.flush(null, resData);
        httpTesting.verify();
        await vi.waitUntil(() => reqCompleted);
        expect(navigationSpy).toHaveBeenCalledTimes(0);
        navigationSpy.mockClear();
      }
    }
  });
});
