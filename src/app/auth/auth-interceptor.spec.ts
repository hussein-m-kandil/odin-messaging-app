import { HttpClient, withInterceptors, provideHttpClient, HttpRequest } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { authInterceptor } from './auth-interceptor';
import { TestBed } from '@angular/core/testing';
import { Auth } from './auth';
import { Mock } from 'vitest';
import { environment } from '../../environments';

const setup = (authTokenMock: Mock<() => string>) => {
  const signOutMock = vi.fn();
  TestBed.configureTestingModule({
    providers: [
      { provide: Auth, useValue: { token: authTokenMock, signOut: signOutMock } },
      provideHttpClient(withInterceptors([authInterceptor])),
      provideHttpClientTesting(),
    ],
  });
  const httpTesting = TestBed.inject(HttpTestingController);
  const http = TestBed.inject(HttpClient);
  return { http, httpTesting, signOutMock };
};

const httpMethods = ['GET', 'PUT', 'POST', 'PATCH', 'DELETE', 'OPTIONS'] as const;
const url = environment.apiUrl;

describe('authInterceptor', () => {
  it('should set the Authorization request-header to the auth token, and send credentials', () => {
    const authToken = 'test_token';
    const { http, httpTesting } = setup(vi.fn(() => authToken));
    for (const method of httpMethods) {
      http.request(new HttpRequest(method, url, null)).subscribe();
      const req = httpTesting.expectOne({ method, url });
      req.flush(null);
      httpTesting.verify();
      expect(req.request.headers.get('Authorization')).toEqual(authToken);
      expect(req.request.withCredentials).toBe(true);
    }
  });

  it('should not send credentials if the URL not starts with the back-end API URL', () => {
    const testUrls = ['/', '/blah', '/foo/bar'];
    const { http, httpTesting } = setup(vi.fn(() => ''));
    for (const method of httpMethods) {
      for (const testUrl of testUrls) {
        http.request(new HttpRequest(method, testUrl, null)).subscribe();
        const req = httpTesting.expectOne({ method, url: testUrl });
        req.flush(null);
        httpTesting.verify();
        expect(req.request.withCredentials).toBe(false);
      }
    }
  });

  it('should not set the Authorization request-header to an empty auth token, but send credentials', () => {
    const authToken = '';
    const { http, httpTesting } = setup(vi.fn(() => authToken));
    for (const method of httpMethods) {
      http.request(new HttpRequest(method, url, null)).subscribe();
      const req = httpTesting.expectOne({ method, url });
      req.flush(null);
      httpTesting.verify();
      expect(req.request.headers.get('Authorization')).toBeNull();
      expect(req.request.withCredentials).toBe(true);
    }
  });

  it('should sign out on a 401 (Unauthorized) response status', async () => {
    const { http, httpTesting, signOutMock } = setup(vi.fn(() => 'test_token'));
    let reqCompleted = false;
    const completeReq = () => setTimeout(() => (reqCompleted = true), 0);
    for (const method of httpMethods) {
      http
        .request(new HttpRequest(method, url, null))
        .subscribe({ next: completeReq, error: completeReq });
      const req = httpTesting.expectOne({ method, url });
      req.flush(null, { status: 401, statusText: 'Unauthorized' });
      httpTesting.verify();
      await vi.waitUntil(() => reqCompleted);
      expect(signOutMock).toHaveBeenCalledTimes(1);
      signOutMock.mockClear();
    }
  });

  it('should not sign out any response status other that the 401', async () => {
    const { http, httpTesting, signOutMock } = setup(vi.fn(() => 'test_token'));
    let reqCompleted = false;
    const completeReq = () => setTimeout(() => (reqCompleted = true), 0);
    for (const method of httpMethods) {
      http
        .request(new HttpRequest(method, url, null))
        .subscribe({ next: completeReq, error: completeReq });
      const req = httpTesting.expectOne({ method, url });
      req.flush(null, { status: 403, statusText: 'Unauthorized' });
      httpTesting.verify();
      await vi.waitUntil(() => reqCompleted);
      expect(signOutMock).toHaveBeenCalledTimes(0);
      signOutMock.mockClear();
    }
  });
});
