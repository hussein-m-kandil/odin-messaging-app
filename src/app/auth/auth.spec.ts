import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { RouterTestingHarness } from '@angular/router/testing';
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

const setup = async (initialRoute?: string) => {
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
  const routerHarness = await RouterTestingHarness.create();
  if (initialRoute) {
    await routerHarness.navigateByUrl(initialRoute);
    navigationSpy.mockClear();
  }
  TestBed.tick(); // This necessary because of the `toObservable` usage
  return { service, storage, httpTesting, routerHarness };
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
      url: `${apiUrl}/auth/signin`,
      methodName: 'signIn' as const,
      method: 'POST' as const,
      resData: authData.user,
      reqData: signupData,
      action: 'sign in',
    },
    {
      url: `${apiUrl}/users`,
      methodName: 'signUp' as const,
      method: 'POST' as const,
      resData: authData.user,
      reqData: signupData,
      action: 'sign up',
    },
    {
      url: `${apiUrl}/users/${user.id}`,
      methodName: 'edit' as const,
      method: 'PATCH' as const,
      resData: authData.user,
      reqData: { ...signupData, password: undefined, confirm: undefined },
      action: 'edit',
    },
  ];

  for (const { url, method, action, methodName, reqData, resData } of testData) {
    const reqBody: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(reqData)) {
      if (reqData[k as keyof typeof reqData]) reqBody[k] = v;
    }

    it(`should ${action}`, async () => {
      const { service, httpTesting, storage } = await setup('/signin');
      const user$ =
        methodName === 'edit' ? service.edit(user.id, reqData) : service[methodName](reqData);
      let result: unknown, error: unknown;
      user$.subscribe({ next: (r) => (result = r), error: (e) => (error = e) });
      const req = httpTesting.expectOne({ method, url }, `Request to ${action}`);
      req.flush(authData);
      TestBed.tick();
      service.authenticated$.subscribe((authenticated) => {
        TestBed.tick();
        expect(navigationSpy).toHaveBeenCalledOnce();
        expect(navigationSpy.mock.calls[0][0]).toBe('/');
        expect(storage.setItem).toHaveBeenCalledOnce();
        expect(req.request.body).toStrictEqual(reqBody);
        expect(service.token()).toStrictEqual(token);
        expect(service.user()).toStrictEqual(user);
        expect(result).toStrictEqual(resData);
        expect(authenticated).toBe(true);
        expect(error).toBeUndefined();
        httpTesting.verify();
      });
    });

    it(`should handle malformed ${action} response`, async () => {
      const { service, httpTesting, storage } = await setup();
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
        const user$ =
          methodName === 'edit' ? service.edit(user.id, reqData) : service[methodName](reqData);
        let result, error;
        user$.subscribe({ next: (r) => (result = r), error: (e) => (error = e) });
        const req = httpTesting.expectOne({ method, url }, `Request to ${action}`);
        req.flush(malResData);
        expect(req.request.body).toStrictEqual(reqBody);
        expect(service.user()).toStrictEqual(null);
        expect(service.token()).toStrictEqual('');
        expect(result).toBeUndefined();
        expect(error).toBeInstanceOf(HttpErrorResponse);
        expect(error).toHaveProperty('status', 500);
        expect(error).toHaveProperty('statusText', 'malformed server response');
        expect(storage.setItem).toHaveBeenCalledTimes(0);
        httpTesting.verify();
      }
    });

    it('should throw backend errors', async () => {
      const { service, httpTesting, storage } = await setup();
      const backendErrors = [
        { status: 500, statusText: 'Server error' },
        { status: 400, statusText: 'Client error' },
      ];
      for (const resError of backendErrors) {
        const user$ =
          methodName === 'edit' ? service.edit(user.id, reqData) : service[methodName](reqData);
        let result, error;
        user$.subscribe({ next: (r) => (result = r), error: (e) => (error = e) });
        const req = httpTesting.expectOne({ method, url }, `Request to ${action}`);
        req.flush(null, resError);
        expect(req.request.body).toStrictEqual(reqBody);
        expect(service.user()).toStrictEqual(null);
        expect(service.token()).toStrictEqual('');
        expect(result).toBeUndefined();
        expect(error).toBeInstanceOf(HttpErrorResponse);
        expect(error).toHaveProperty('status', resError.status);
        expect(error).toHaveProperty('statusText', resError.statusText);
        expect(storage.setItem).toHaveBeenCalledTimes(0);
        httpTesting.verify();
      }
    });

    it('should throw backend errors', async () => {
      const { service, httpTesting, storage } = await setup();
      const user$ =
        methodName === 'edit' ? service.edit(user.id, reqData) : service[methodName](reqData);
      let result, error;
      user$.subscribe({ next: (r) => (result = r), error: (e) => (error = e) });
      const req = httpTesting.expectOne({ method, url }, `Request to ${action}`);
      const networkError = new ProgressEvent('Network error!');
      req.error(networkError);
      expect(req.request.body).toStrictEqual(reqBody);
      expect(service.user()).toStrictEqual(null);
      expect(service.token()).toStrictEqual('');
      expect(result).toBeUndefined();
      expect(error).toBeInstanceOf(HttpErrorResponse);
      expect(error).toHaveProperty('status', 0);
      expect(error).toHaveProperty('error', networkError);
      expect(storage.setItem).toHaveBeenCalledTimes(0);
      httpTesting.verify();
    });
  }

  it('should not be authenticated, and not try to verify a non-existent token', async () => {
    const { service, httpTesting } = await setup();
    service.authenticated$.subscribe((authenticated) => {
      expect(authenticated).toBe(false);
      httpTesting.verify();
    });
  });

  it('should be authenticated after a successful verification', async () => {
    const { service, httpTesting, storage } = await setup('/signin');
    storage.getItem.mockImplementation(() => token);
    let result: unknown, error: unknown;
    service.authenticated$.subscribe({ next: (r) => (result = r), error: (e) => (error = e) });
    const reqProps = { method: 'GET', url: `${apiUrl}/auth/me` };
    const req = httpTesting.expectOne(reqProps, `Request to verify user auth-token`);
    req.flush(user);
    TestBed.tick();
    expect(req.request.body).toStrictEqual(null);
    expect(navigationSpy).toHaveBeenCalledOnce();
    expect(storage.getItem).toHaveBeenCalledOnce();
    expect(storage.setItem).toHaveBeenCalledOnce();
    expect(navigationSpy.mock.calls[0][0]).toBe('/');
    expect(req.request.headers.get('Authorization')).toBe(token);
    expect(service.token()).toStrictEqual(token);
    expect(service.user()).toStrictEqual(user);
    expect(error).toBeUndefined();
    expect(result).toBe(true);
    httpTesting.verify();
  });

  it('should not be authenticated after an unsuccessful verification', async () => {
    const { service, httpTesting, storage } = await setup();
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
    expect(service.token()).toStrictEqual('');
    expect(error).toBeUndefined();
    expect(result).toBe(false);
    httpTesting.verify();
  });

  it('should not be authenticated after an errored verification', async () => {
    const { service, httpTesting, storage } = await setup();
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
    expect(service.token()).toStrictEqual('');
    expect(result).toBeUndefined();
    expect(error).toBeInstanceOf(HttpErrorResponse);
    expect(error).toHaveProperty('error', networkError);
    expect(error).toHaveProperty('status', 0);
    httpTesting.verify();
  });

  it('should sign out', async () => {
    let testToken: string | null = 'test_token';
    const { service, httpTesting, storage } = await setup();
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

  it('should delete and sign out', async () => {
    let testToken: string | null = 'test_token';
    const { service, httpTesting, storage } = await setup();
    storage.getItem.mockImplementation(() => testToken);
    storage.removeItem.mockImplementation(() => (testToken = null));
    service.authenticated$.subscribe();
    httpTesting
      .expectOne({ method: 'GET', url: `${apiUrl}/auth/me` }, `Request to verify user auth-token`)
      .flush(user);
    let result: unknown, error: unknown;
    service.delete(user.id).subscribe({ next: (r) => (result = r), error: (e) => (error = e) });
    httpTesting
      .expectOne({ method: 'DELETE', url: `${apiUrl}/users/${user.id}` }, `Request to delete`)
      .flush('', { status: 204, statusText: 'No content' });
    TestBed.tick();
    expect(result).toBe('');
    expect(testToken).toBeNull();
    expect(error).toBeUndefined();
    expect(navigationSpy).toHaveBeenCalledOnce();
    expect(navigationSpy.mock.calls[0][0]).toBe('/signin');
    expect(storage.removeItem).toHaveBeenCalledOnce();
    storage.removeItem.mockReset();
    storage.getItem.mockReset();
    httpTesting.verify();
  });

  it('should fail to delete and not sign out', async () => {
    let testToken: string | null = 'test_token';
    const { service, httpTesting, storage } = await setup();
    storage.getItem.mockImplementation(() => testToken);
    storage.removeItem.mockImplementation(() => (testToken = null));
    service.authenticated$.subscribe();
    httpTesting
      .expectOne({ method: 'GET', url: `${apiUrl}/auth/me` }, `Request to verify user auth-token`)
      .flush(user);
    let result: unknown, error: unknown;
    service.delete(user.id).subscribe({ next: (r) => (result = r), error: (e) => (error = e) });
    httpTesting
      .expectOne({ method: 'DELETE', url: `${apiUrl}/users/${user.id}` }, `Request to delete`)
      .flush('Failed', { status: 500, statusText: 'Internal server error' });
    TestBed.tick();
    expect(result).toBeUndefined();
    expect(testToken).toBeTruthy();
    expect(navigationSpy).toHaveBeenCalledTimes(0);
    expect(storage.removeItem).toHaveBeenCalledTimes(0);
    expect(error).toBeInstanceOf(HttpErrorResponse);
    expect(error).toHaveProperty('error', 'Failed');
    expect(error).toHaveProperty('status', 500);
    storage.removeItem.mockReset();
    storage.getItem.mockReset();
    httpTesting.verify();
  });

  it('should update user data', async () => {
    const updatedUserData = { username: 'updated_username' };
    const { service, httpTesting, storage } = await setup('/signin');
    storage.getItem.mockImplementation(() => token);
    service.authenticated$.subscribe();
    httpTesting
      .expectOne({ method: 'GET', url: `${apiUrl}/auth/me` }, `Request to verify user auth-token`)
      .flush(user);
    service.updateUser(updatedUserData);
    expect(service.user()).toStrictEqual({ ...user, ...updatedUserData });
    httpTesting.verify();
  });

  it('should not update user data', async () => {
    const updatedUserData = { username: 'updated_username' };
    const { service } = await setup('/signin');
    service.updateUser(updatedUserData);
    expect(service.user()).toStrictEqual(null);
  });
});
