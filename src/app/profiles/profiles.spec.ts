import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { environment } from '../../environments';
import { TestBed } from '@angular/core/testing';
import { Profile, User } from '../app.types';
import { Profiles } from './profiles';
import { Auth } from '../auth';

const { apiUrl } = environment;
const profilesUrl = `${apiUrl}/profiles`;

const user = {
  id: crypto.randomUUID(),
  username: 'test_user',
  fullname: 'Test User',
  bio: 'Test bio.',
} as User;
const profile = { id: crypto.randomUUID(), user } as unknown as Profile;
user.profile = profile;
const user2 = {
  id: crypto.randomUUID(),
  username: 'test_user_2',
  fullname: 'Test User 2',
  bio: 'Test bio 2.',
} as User;
const profile2 = { id: crypto.randomUUID(), user: user2 } as unknown as Profile;
user2.profile = profile2;

const profiles = [profile, profile2] as Profile[];

const authMock = { user: vi.fn(() => null as typeof user | null) };

const setup = () => {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: Auth, useValue: authMock },
    ],
  });
  const httpTesting = TestBed.inject(HttpTestingController);
  const service = TestBed.inject(Profiles);
  return { service, httpTesting };
};

describe('Profiles', () => {
  it('should load the profiles', () => {
    const { service, httpTesting } = setup();
    service.load();
    const reqInfo = { method: 'GET', url: profilesUrl };
    const req = httpTesting.expectOne(reqInfo, 'Request to get the profiles');
    req.flush(profiles);
    expect(service.list()).toStrictEqual(profiles);
    httpTesting.verify();
  });

  it('should fail to load the profiles on the 1st time due to a server error, then succeed on the 2nd', () => {
    const { service, httpTesting } = setup();
    service.load();
    const reqInfo = { method: 'GET', url: profilesUrl };
    const req = httpTesting.expectOne(reqInfo, 'Request to get the profiles');
    req.flush('Failed', { status: 500, statusText: 'Internal Server Error' });
    expect(service.loadError()).toMatch(/failed/i);
    expect(service.list()).toStrictEqual([]);
    httpTesting.verify();
  });

  it('should fail to load the profiles on the 1st time due to a network error, then succeed on the 2nd', () => {
    const { service, httpTesting } = setup();
    service.load();
    const reqInfo = { method: 'GET', url: profilesUrl };
    const req = httpTesting.expectOne(reqInfo, 'Request to get the profiles');
    req.error(new ProgressEvent('Network error'));
    expect(service.loadError()).toMatch(/check .*(internet)? connection/i);
    expect(service.list()).toStrictEqual([]);
    httpTesting.verify();
  });

  it('should load more the profiles', () => {
    const { service, httpTesting } = setup();
    service.list.set([profiles[0]]);
    service.load();
    const reqInfo = { method: 'GET', url: `${profilesUrl}?cursor=${profiles[0].id}` };
    const req = httpTesting.expectOne(reqInfo, 'Request to get more profiles');
    const resData = [profiles[1]];
    req.flush(resData);
    expect(service.list()).toStrictEqual(profiles);
    httpTesting.verify();
  });

  it('should fail to load more profiles on the 1st due to a server error, then succeed on the 2nd', () => {
    const { service, httpTesting } = setup();
    service.list.set([profiles[0]]);
    service.load();
    const reqInfo = { method: 'GET', url: `${profilesUrl}?cursor=${profiles[0].id}` };
    const req = httpTesting.expectOne(reqInfo, 'Request to get more profiles');
    req.flush('Failed', { status: 500, statusText: 'Internal server error' });
    expect(service.list()).toStrictEqual([profiles[0]]);
    expect(service.loadError()).toMatch(/failed/i);
    httpTesting.verify();
  });

  it('should fail to load more profiles on the 1st due to a network error, then succeed on the 2nd', () => {
    const { service, httpTesting } = setup();
    service.list.set([profiles[0]]);
    service.load();
    const reqInfo = { method: 'GET', url: `${profilesUrl}?cursor=${profiles[0].id}` };
    const req = httpTesting.expectOne(reqInfo, 'Request to get more profiles');
    req.error(new ProgressEvent('Network error'));
    expect(service.loadError()).toMatch(/check .*(internet)? connection/i);
    expect(service.list()).toStrictEqual([profiles[0]]);
    httpTesting.verify();
  });

  it('should get a profile from the current list', () => {
    const { service, httpTesting } = setup();
    const profile = profiles[1];
    service.list.set(profiles);
    const profile$ = service.getProfile(profile.id);
    let resData, resError;
    profile$.subscribe({ next: (d) => (resData = d), error: (e) => (resError = e) });
    httpTesting.expectNone(`${profilesUrl}/${profile.id}`, 'Request to get a profile');
    expect(resData).toEqual(profile);
    expect(resError).toBeUndefined();
    httpTesting.verify();
  });

  it('should get a profile from the backend', () => {
    const { service, httpTesting } = setup();
    const profileId = crypto.randomUUID();
    service.list.set(profiles);
    const profile$ = service.getProfile(profileId);
    let resData, resError;
    profile$.subscribe({ next: (d) => (resData = d), error: (e) => (resError = e) });
    const reqInfo = { method: 'GET', url: `${profilesUrl}/${profileId}` };
    const req = httpTesting.expectOne(reqInfo, 'Request to get a profile');
    req.flush(profiles[1]);
    expect(resData).toEqual(profiles[1]);
    expect(resError).toBeUndefined();
    httpTesting.verify();
  });

  it('should fail to get a profile from the backend due to a server error', () => {
    const { service, httpTesting } = setup();
    const profileId = crypto.randomUUID();
    service.list.set(profiles);
    const profile$ = service.getProfile(profileId);
    let resData, resError;
    profile$.subscribe({ next: (d) => (resData = d), error: (e) => (resError = e) });
    const reqInfo = { method: 'GET', url: `${profilesUrl}/${profileId}` };
    const req = httpTesting.expectOne(reqInfo, 'Request to get a profile');
    const error = 'Failed';
    req.flush(error, { status: 500, statusText: 'Internal server error' });
    expect(resError).toBeInstanceOf(HttpErrorResponse);
    expect(resError).toHaveProperty('error', error);
    expect(resError).toHaveProperty('status', 500);
    expect(resData).toBeUndefined();
    httpTesting.verify();
  });

  it('should fail to get a profile from the backend due to a network error', () => {
    const { service, httpTesting } = setup();
    const profileId = crypto.randomUUID();
    service.list.set(profiles);
    const profile$ = service.getProfile(profileId);
    let resData, resError;
    profile$.subscribe({ next: (d) => (resData = d), error: (e) => (resError = e) });
    const reqInfo = { method: 'GET', url: `${profilesUrl}/${profileId}` };
    const req = httpTesting.expectOne(reqInfo, 'Request to get a profile');
    const error = new ProgressEvent('Network error');
    req.error(error);
    expect(resError).toBeInstanceOf(HttpErrorResponse);
    expect(resError).toHaveProperty('error', error);
    expect(resError).toHaveProperty('status', 0);
    expect(resData).toBeUndefined();
    httpTesting.verify();
  });

  it('should be the current profile', () => {
    authMock.user.mockImplementationOnce(() => user);
    const { service } = setup();
    expect(service.isCurrentProfile(profile.id)).toBe(true);
  });

  it('should not be the current profile', () => {
    authMock.user.mockImplementationOnce(() => user2);
    const { service } = setup();
    expect(service.isCurrentProfile(profile.id)).toBe(false);
  });

  it('should not be the current profile if unauthenticated', () => {
    authMock.user.mockImplementationOnce(() => null);
    const { service } = setup();
    expect(service.isCurrentProfile(profile.id)).toBe(false);
  });
});
