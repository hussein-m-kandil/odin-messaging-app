import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { environment } from '../../environments';
import { TestBed } from '@angular/core/testing';
import { Profile } from '../app.types';
import { Profiles } from './profiles';

const { apiUrl } = environment;
const profilesUrl = `${apiUrl}/profiles`;

const setup = () => {
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
  const httpTesting = TestBed.inject(HttpTestingController);
  const service = TestBed.inject(Profiles);
  return { service, httpTesting };
};

const profiles = [{ id: crypto.randomUUID() }, { id: crypto.randomUUID() }] as Profile[];

const getServiceState = (service: Profiles) => {
  return {
    list: service.list(),
    loading: service.loading(),
    canLoad: service.canLoad(),
    loadError: service.loadError(),
    loadingMore: service.loadingMore(),
    canLoadMore: service.canLoadMore(),
    loadMoreError: service.loadMoreError(),
  };
};

describe('Profiles', () => {
  it('should have the expected initial state', () => {
    const { service } = setup();
    const serviceInitialState = getServiceState(service);
    expect(serviceInitialState.canLoadMore).toBe(false);
    expect(serviceInitialState.loadingMore).toBe(false);
    expect(serviceInitialState.list).toStrictEqual([]);
    expect(serviceInitialState.loadMoreError).toBe('');
    expect(serviceInitialState.canLoad).toBe(true);
    expect(serviceInitialState.loadError).toBe('');
    expect(serviceInitialState.loading).toBe(false);
  });

  it('should load the profiles', () => {
    const { service, httpTesting } = setup();
    service.list.set([profiles[0]]);
    service.load();
    const reqInfo = { method: 'GET', url: profilesUrl };
    const req = httpTesting.expectOne(reqInfo, 'Request to get the profiles');
    const serviceLoadingState = getServiceState(service);
    req.flush(profiles);
    const serviceFinalState = getServiceState(service);
    expect(serviceLoadingState.loading).toBe(true);
    expect(serviceLoadingState.canLoad).toBe(false);
    expect(serviceLoadingState.loadError).toBe('');
    expect(serviceLoadingState.loadMoreError).toBe('');
    expect(serviceLoadingState.canLoadMore).toBe(false);
    expect(serviceLoadingState.loadingMore).toBe(false);
    expect(serviceLoadingState.list).toStrictEqual([]);
    expect(serviceFinalState.list).toStrictEqual(profiles);
    expect(serviceFinalState.loadingMore).toBe(false);
    expect(serviceFinalState.loadMoreError).toBe('');
    expect(serviceFinalState.canLoadMore).toBe(true);
    expect(serviceFinalState.loading).toBe(false);
    expect(serviceFinalState.canLoad).toBe(true);
    expect(serviceFinalState.loadError).toBe('');
    httpTesting.verify();
  });

  it('should fail to load the profiles on the 1st time due to a server error, then succeed on the 2nd', () => {
    const { service, httpTesting } = setup();
    const checkReq = () => {
      const reqInfo = { method: 'GET', url: profilesUrl };
      return httpTesting.expectOne(reqInfo, 'Request to get the profiles');
    };
    service.list.set([profiles[0]]);
    service.load();
    const reqInfo = { method: 'GET', url: profilesUrl };
    const firstReq = httpTesting.expectOne(reqInfo, 'Request to get the profiles');
    const serviceLoadingState = getServiceState(service);
    firstReq.flush('Failed', { status: 500, statusText: 'Internal Server Error' });
    const serviceErrorState = getServiceState(service);
    service.load();
    const secondReq = checkReq();
    const serviceSecondLoadingState = getServiceState(service);
    secondReq.flush(profiles);
    const serviceFinalState = getServiceState(service);
    expect(serviceLoadingState.loading).toBe(true);
    expect(serviceLoadingState.canLoad).toBe(false);
    expect(serviceLoadingState.loadError).toBe('');
    expect(serviceLoadingState.loadMoreError).toBe('');
    expect(serviceLoadingState.canLoadMore).toBe(false);
    expect(serviceLoadingState.loadingMore).toBe(false);
    expect(serviceLoadingState.list).toStrictEqual([]);
    expect(serviceErrorState.loadError).toMatch(/failed/i);
    expect(serviceErrorState.list).toStrictEqual([]);
    expect(serviceErrorState.loadingMore).toBe(false);
    expect(serviceErrorState.canLoadMore).toBe(false);
    expect(serviceErrorState.loadMoreError).toBe('');
    expect(serviceErrorState.loading).toBe(false);
    expect(serviceErrorState.canLoad).toBe(true);
    expect(serviceSecondLoadingState).toStrictEqual(serviceLoadingState);
    expect(serviceFinalState.list).toStrictEqual(profiles);
    expect(serviceFinalState.loadingMore).toBe(false);
    expect(serviceFinalState.loadMoreError).toBe('');
    expect(serviceFinalState.canLoadMore).toBe(true);
    expect(serviceFinalState.loading).toBe(false);
    expect(serviceFinalState.canLoad).toBe(true);
    expect(serviceFinalState.loadError).toBe('');
    httpTesting.verify();
  });

  it('should fail to load the profiles on the 1st time due to a network error, then succeed on the 2nd', () => {
    const { service, httpTesting } = setup();
    const checkReq = () => {
      const reqInfo = { method: 'GET', url: profilesUrl };
      return httpTesting.expectOne(reqInfo, 'Request to get the profiles');
    };
    service.list.set([profiles[0]]);
    service.load();
    const reqInfo = { method: 'GET', url: profilesUrl };
    const firstReq = httpTesting.expectOne(reqInfo, 'Request to get the profiles');
    const serviceLoadingState = getServiceState(service);
    firstReq.error(new ProgressEvent('Network error'));
    const serviceErrorState = getServiceState(service);
    service.load();
    const secondReq = checkReq();
    const serviceSecondLoadingState = getServiceState(service);
    secondReq.flush(profiles);
    const serviceFinalState = getServiceState(service);
    expect(serviceLoadingState.loading).toBe(true);
    expect(serviceLoadingState.canLoad).toBe(false);
    expect(serviceLoadingState.loadError).toBe('');
    expect(serviceLoadingState.loadMoreError).toBe('');
    expect(serviceLoadingState.canLoadMore).toBe(false);
    expect(serviceLoadingState.loadingMore).toBe(false);
    expect(serviceLoadingState.list).toStrictEqual([]);
    expect(serviceErrorState.loadError).toMatch(/check .*(internet)? connection/i);
    expect(serviceErrorState.list).toStrictEqual([]);
    expect(serviceErrorState.loadingMore).toBe(false);
    expect(serviceErrorState.canLoadMore).toBe(false);
    expect(serviceErrorState.loadMoreError).toBe('');
    expect(serviceErrorState.loading).toBe(false);
    expect(serviceErrorState.canLoad).toBe(true);
    expect(serviceSecondLoadingState).toStrictEqual(serviceLoadingState);
    expect(serviceFinalState.list).toStrictEqual(profiles);
    expect(serviceFinalState.loadingMore).toBe(false);
    expect(serviceFinalState.loadMoreError).toBe('');
    expect(serviceFinalState.canLoadMore).toBe(true);
    expect(serviceFinalState.loading).toBe(false);
    expect(serviceFinalState.canLoad).toBe(true);
    expect(serviceFinalState.loadError).toBe('');
    httpTesting.verify();
  });

  it('should load more the profiles', () => {
    const { service, httpTesting } = setup();
    service.list.set([profiles[0]]);
    service.loadMore();
    const reqInfo = { method: 'GET', url: `${profilesUrl}?cursor=${profiles[0].id}` };
    const req = httpTesting.expectOne(reqInfo, 'Request to get more profiles');
    const serviceLoadingState = getServiceState(service);
    const resData = [profiles[1]];
    req.flush(resData);
    const serviceFinalState = getServiceState(service);
    expect(serviceLoadingState.loading).toBe(false);
    expect(serviceLoadingState.canLoad).toBe(false);
    expect(serviceLoadingState.loadError).toBe('');
    expect(serviceLoadingState.loadMoreError).toBe('');
    expect(serviceLoadingState.canLoadMore).toBe(false);
    expect(serviceLoadingState.loadingMore).toBe(true);
    expect(serviceLoadingState.list).toStrictEqual([profiles[0]]);
    expect(serviceFinalState.list).toStrictEqual(profiles);
    expect(serviceFinalState.loadingMore).toBe(false);
    expect(serviceFinalState.loadMoreError).toBe('');
    expect(serviceFinalState.canLoadMore).toBe(true);
    expect(serviceFinalState.loading).toBe(false);
    expect(serviceFinalState.canLoad).toBe(true);
    expect(serviceFinalState.loadError).toBe('');
    httpTesting.verify();
  });

  it('should fail to load more profiles on the 1st due to a server error, then succeed on the 2nd', () => {
    const { service, httpTesting } = setup();
    const checkReq = () => {
      const reqInfo = { method: 'GET', url: `${profilesUrl}?cursor=${profiles[0].id}` };
      return httpTesting.expectOne(reqInfo, 'Request to get more profiles');
    };
    service.list.set([profiles[0]]);
    service.loadMore();
    const firstReq = checkReq();
    const serviceLoadingState = getServiceState(service);
    firstReq.flush('Failed', { status: 500, statusText: 'Internal server error' });
    const serviceErrorState = getServiceState(service);
    service.loadMore();
    const secondReq = checkReq();
    const serviceSecondLoadingState = getServiceState(service);
    secondReq.flush([profiles[1]]);
    const serviceFinalState = getServiceState(service);
    expect(serviceLoadingState.loading).toBe(false);
    expect(serviceLoadingState.canLoad).toBe(false);
    expect(serviceLoadingState.loadError).toBe('');
    expect(serviceLoadingState.loadMoreError).toBe('');
    expect(serviceLoadingState.canLoadMore).toBe(false);
    expect(serviceLoadingState.loadingMore).toBe(true);
    expect(serviceLoadingState.list).toStrictEqual([profiles[0]]);
    expect(serviceErrorState.loadMoreError).toMatch(/failed/i);
    expect(serviceErrorState.list).toStrictEqual([profiles[0]]);
    expect(serviceErrorState.loadingMore).toBe(false);
    expect(serviceErrorState.canLoadMore).toBe(false);
    expect(serviceErrorState.loading).toBe(false);
    expect(serviceErrorState.canLoad).toBe(true);
    expect(serviceErrorState.loadError).toBe('');
    expect(serviceSecondLoadingState).toStrictEqual(serviceLoadingState);
    expect(serviceFinalState.list).toStrictEqual(profiles);
    expect(serviceFinalState.loadingMore).toBe(false);
    expect(serviceFinalState.loadMoreError).toBe('');
    expect(serviceFinalState.canLoadMore).toBe(true);
    expect(serviceFinalState.loading).toBe(false);
    expect(serviceFinalState.canLoad).toBe(true);
    expect(serviceFinalState.loadError).toBe('');
    httpTesting.verify();
  });

  it('should fail to load more profiles on the 1st due to a network error, then succeed on the 2nd', () => {
    const { service, httpTesting } = setup();
    const checkReq = () => {
      const reqInfo = { method: 'GET', url: `${profilesUrl}?cursor=${profiles[0].id}` };
      return httpTesting.expectOne(reqInfo, 'Request to get more profiles');
    };
    service.list.set([profiles[0]]);
    service.loadMore();
    const firstReq = checkReq();
    const serviceLoadingState = getServiceState(service);
    firstReq.error(new ProgressEvent('Network error'));
    const serviceErrorState = getServiceState(service);
    service.loadMore();
    const secondReq = checkReq();
    const serviceSecondLoadingState = getServiceState(service);
    secondReq.flush([profiles[1]]);
    const serviceFinalState = getServiceState(service);
    expect(serviceLoadingState.loading).toBe(false);
    expect(serviceLoadingState.canLoad).toBe(false);
    expect(serviceLoadingState.loadError).toBe('');
    expect(serviceLoadingState.loadMoreError).toBe('');
    expect(serviceLoadingState.canLoadMore).toBe(false);
    expect(serviceLoadingState.loadingMore).toBe(true);
    expect(serviceLoadingState.list).toStrictEqual([profiles[0]]);
    expect(serviceErrorState.loadMoreError).toMatch(/check .*(internet)? connection/i);
    expect(serviceErrorState.list).toStrictEqual([profiles[0]]);
    expect(serviceErrorState.loadingMore).toBe(false);
    expect(serviceErrorState.canLoadMore).toBe(false);
    expect(serviceErrorState.loading).toBe(false);
    expect(serviceErrorState.canLoad).toBe(true);
    expect(serviceErrorState.loadError).toBe('');
    expect(serviceSecondLoadingState).toStrictEqual(serviceLoadingState);
    expect(serviceFinalState.list).toStrictEqual(profiles);
    expect(serviceFinalState.loadingMore).toBe(false);
    expect(serviceFinalState.loadMoreError).toBe('');
    expect(serviceFinalState.canLoadMore).toBe(true);
    expect(serviceFinalState.loading).toBe(false);
    expect(serviceFinalState.canLoad).toBe(true);
    expect(serviceFinalState.loadError).toBe('');
    httpTesting.verify();
  });
});
