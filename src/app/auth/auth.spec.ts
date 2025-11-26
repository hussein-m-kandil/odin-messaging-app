import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { provideRouter, Router } from '@angular/router';
import { SigninData, SignupData } from './auth.types';
import { environment } from '../../environments';
import { TestBed } from '@angular/core/testing';
import { AppStorage } from '../app-storage';
import { Component } from '@angular/core';
import { Auth } from './auth';

const appStorageMock = { removeItem: vi.fn(), getItem: vi.fn(), setItem: vi.fn() };

const navigationSpy = vi.spyOn(Router.prototype, 'navigateByUrl');

@Component({ template: '<h1>Dummy</h1>' })
class Dummy {}

const setup = () => {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([{ path: '**', component: Dummy }]),
      { provide: AppStorage, useValue: appStorageMock },
    ],
  });
  const storage = TestBed.inject(AppStorage) as unknown as typeof appStorageMock;
  const httpTesting = TestBed.inject(HttpTestingController);
  const service = TestBed.inject(Auth);
  TestBed.tick(); // This necessary because of the `toObservable` usage
  return { service, storage, httpTesting };
};

const { apiUrl } = environment;

const token = 'test_token';
const id = crypto.randomUUID();
const user = { id, username: 'test_user', fullname: 'Test User', profile: { id } };

const authData = { token, user };

const signinData: SigninData = { username: user.username, password: 'test@pass123' };
const signupData: SignupData = {
  ...signinData,
  confirm: signinData.password,
  fullname: user.fullname,
};

describe('Auth', () => {
  afterEach(vi.clearAllMocks);

  const testData = [
    {
      methodName: 'signIn' as const,
      resData: authData.user,
      reqData: signupData,
      path: '/auth/signin',
      suffix: 'in',
    },
    {
      methodName: 'signUp' as const,
      resData: authData.user,
      reqData: signupData,
      path: '/users',
      suffix: 'up',
    },
  ];

  for (const { path, methodName, reqData, resData, suffix } of testData) {
    it(`should sign ${suffix}`, async () => {
      const { service, httpTesting, storage } = setup();
      const user$ = service[methodName](reqData);
      let result: unknown, error: unknown;
      user$.subscribe({ next: (r) => (result = r), error: (e) => (error = e) });
      const reqProps = { method: 'POST', url: `${apiUrl}${path}` };
      const req = httpTesting.expectOne(reqProps, `Request to sign ${suffix}`);
      req.flush(authData);
      TestBed.tick();
      service.authenticated$.subscribe((authenticated) => {
        TestBed.tick();
        expect(navigationSpy).toHaveBeenCalledOnce();
        expect(navigationSpy.mock.calls[0][0]).toBe('/');
        expect(storage.setItem).toHaveBeenCalledOnce();
        expect(req.request.body).toStrictEqual(reqData);
        expect(service.user()).toStrictEqual(user);
        expect(result).toStrictEqual(resData);
        expect(authenticated).toBe(true);
        expect(error).toBeUndefined();
        httpTesting.verify();
      });
    });

    it(`should handle malformed sign-${suffix} response`, () => {
      const reqProps = { method: 'POST', url: `${apiUrl}${path}` };
      const { service, httpTesting, storage } = setup();
      const malformedResponses = [
        { user },
        { token },
        { ...authData, user: { ...user, profile: undefined } },
        { ...authData, user: { ...user, username: undefined } },
        { ...authData, user: { ...user, fullname: undefined } },
        { ...authData, user: { ...user, profile: { id: 777 } } },
        { ...authData, user: { ...user, username: 777 } },
        { ...authData, user: { ...user, fullname: 777 } },
      ];
      for (const malResData of malformedResponses) {
        const user$ = service[methodName](reqData);
        let result, error;
        user$.subscribe({ next: (r) => (result = r), error: (e) => (error = e) });
        const req = httpTesting.expectOne(reqProps, `Request to sign ${suffix}`);
        req.flush(malResData);
        expect(req.request.body).toStrictEqual(reqData);
        expect(service.user()).toStrictEqual(null);
        expect(result).toBeUndefined();
        expect(error).toBeInstanceOf(HttpErrorResponse);
        expect(error).toHaveProperty('status', 500);
        expect(error).toHaveProperty('statusText', 'malformed server response');
        expect(storage.setItem).toHaveBeenCalledTimes(0);
        httpTesting.verify();
      }
    });

    it('should throw backend errors', () => {
      const reqProps = { method: 'POST', url: `${apiUrl}${path}` };
      const { service, httpTesting, storage } = setup();
      const backendErrors = [
        { status: 500, statusText: 'Server error' },
        { status: 400, statusText: 'Client error' },
      ];
      for (const resError of backendErrors) {
        const user$ = service[methodName](reqData);
        let result, error;
        user$.subscribe({ next: (r) => (result = r), error: (e) => (error = e) });
        const req = httpTesting.expectOne(reqProps, `Request to sign ${suffix}`);
        req.flush(null, resError);
        expect(req.request.body).toStrictEqual(reqData);
        expect(service.user()).toStrictEqual(null);
        expect(result).toBeUndefined();
        expect(error).toBeInstanceOf(HttpErrorResponse);
        expect(error).toHaveProperty('status', resError.status);
        expect(error).toHaveProperty('statusText', resError.statusText);
        expect(storage.setItem).toHaveBeenCalledTimes(0);
        httpTesting.verify();
      }
    });

    it('should throw backend errors', () => {
      const reqProps = { method: 'POST', url: `${apiUrl}${path}` };
      const { service, httpTesting, storage } = setup();
      const user$ = service[methodName](reqData);
      let result, error;
      user$.subscribe({ next: (r) => (result = r), error: (e) => (error = e) });
      const req = httpTesting.expectOne(reqProps, `Request to sign ${suffix}`);
      const networkError = new ProgressEvent('Network error!');
      req.error(networkError);
      expect(req.request.body).toStrictEqual(reqData);
      expect(service.user()).toStrictEqual(null);
      expect(result).toBeUndefined();
      expect(error).toBeInstanceOf(HttpErrorResponse);
      expect(error).toHaveProperty('status', 0);
      expect(error).toHaveProperty('error', networkError);
      expect(storage.setItem).toHaveBeenCalledTimes(0);
      httpTesting.verify();
    });
  }

  it('should not be authenticated, and not try to verify a non-existent token', () => {
    const { service, httpTesting } = setup();
    service.authenticated$.subscribe((authenticated) => {
      expect(authenticated).toBe(false);
      httpTesting.verify();
    });
  });

  it('should be authenticated after a successful verification', () => {
    const { service, httpTesting, storage } = setup();
    storage.getItem.mockImplementation(() => token);
    let result: unknown, error: unknown;
    service.authenticated$.subscribe({ next: (r) => (result = r), error: (e) => (error = e) });
    const reqProps = { method: 'GET', url: `${apiUrl}/auth/me` };
    const req = httpTesting.expectOne(reqProps, `Request to verify user auth-token`);
    req.flush(user);
    TestBed.tick();
    expect(navigationSpy).toHaveBeenCalledOnce();
    expect(navigationSpy.mock.calls[0][0]).toBe('/');
    expect(req.request.headers.get('Authorization')).toBe(token);
    expect(storage.getItem).toHaveBeenCalledOnce();
    expect(storage.setItem).toHaveBeenCalledOnce();
    expect(req.request.body).toStrictEqual(null);
    expect(service.user()).toStrictEqual(user);
    expect(error).toBeUndefined();
    expect(result).toBe(true);
    httpTesting.verify();
  });

  it('should not be authenticated after an unsuccessful verification', () => {
    const { service, httpTesting, storage } = setup();
    storage.getItem.mockImplementationOnce(() => token);
    let result: unknown, error: unknown;
    service.authenticated$.subscribe({ next: (r) => (result = r), error: (e) => (error = e) });
    const reqProps = { method: 'GET', url: `${apiUrl}/auth/me` };
    const req = httpTesting.expectOne(reqProps, `Request to verify user auth-token`);
    req.flush(null, { status: 401, statusText: 'Unauthorized' });
    expect(req.request.headers.get('Authorization')).toBe(token);
    expect(storage.setItem).toHaveBeenCalledTimes(0);
    expect(storage.getItem).toHaveBeenCalledOnce();
    expect(req.request.body).toStrictEqual(null);
    expect(service.user()).toStrictEqual(null);
    expect(error).toBeUndefined();
    expect(result).toBe(false);
    httpTesting.verify();
  });

  it('should not be authenticated after an errored verification', () => {
    const { service, httpTesting, storage } = setup();
    storage.getItem.mockImplementationOnce(() => token);
    let result: unknown, error: unknown;
    service.authenticated$.subscribe({ next: (r) => (result = r), error: (e) => (error = e) });
    const reqProps = { method: 'GET', url: `${apiUrl}/auth/me` };
    const req = httpTesting.expectOne(reqProps, `Request to verify user auth-token`);
    const networkError = new ProgressEvent('Network error!');
    req.error(networkError);
    expect(req.request.headers.get('Authorization')).toBe(token);
    expect(storage.setItem).toHaveBeenCalledTimes(0);
    expect(storage.getItem).toHaveBeenCalledOnce();
    expect(req.request.body).toStrictEqual(null);
    expect(service.user()).toStrictEqual(null);
    expect(result).toBeUndefined();
    expect(error).toBeInstanceOf(HttpErrorResponse);
    expect(error).toHaveProperty('error', networkError);
    expect(error).toHaveProperty('status', 0);
    httpTesting.verify();
  });

  it('should sign out', () => {
    let testToken: string | null = 'test_token';
    const { service, httpTesting, storage } = setup();
    storage.getItem.mockImplementation(() => testToken);
    storage.removeItem.mockImplementation(() => (testToken = null));
    let result: unknown, error: unknown;
    service.authenticated$.subscribe({ next: (r) => (result = r), error: (e) => (error = e) });
    const reqProps = { method: 'GET', url: `${apiUrl}/auth/me` };
    const req = httpTesting.expectOne(reqProps, `Request to verify user auth-token`);
    req.flush(user);
    service.signOut();
    TestBed.tick();
    service.authenticated$.subscribe({ next: (r) => (result = r), error: (e) => (error = e) });
    httpTesting.expectNone(`${apiUrl}/auth/me`, `Request to verify user auth-token`);
    expect(result).toBe(false);
    expect(testToken).toBeNull();
    expect(error).toBeUndefined();
    expect(navigationSpy).toHaveBeenCalledOnce();
    expect(navigationSpy.mock.calls[0][0]).toBe('/signin');
    expect(storage.removeItem).toHaveBeenCalledOnce();
    storage.removeItem.mockReset();
    storage.getItem.mockReset();
    httpTesting.verify();
  });
});
