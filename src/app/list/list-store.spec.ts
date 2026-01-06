import { asyncScheduler, observeOn, of, throwError } from 'rxjs';
import { TestBed } from '@angular/core/testing';
import { Injectable } from '@angular/core';
import { ListStore } from './list-store';

const dataReqMock = vi.fn(() => of([1, 2, 3]));

const testErrMsg = 'Failed to load any numbers.';

@Injectable({ providedIn: 'root' })
class ConcreteListStore extends ListStore<number> {
  protected override loadErrorMessage = testErrMsg;

  protected getMore() {
    return dataReqMock();
  }
}

const setup = () => {
  TestBed.configureTestingModule({});
  const service = TestBed.inject(ConcreteListStore);
  return { service };
};

const getServiceState = (service: ConcreteListStore) => {
  return {
    list: service.list(),
    loading: service.loading(),
    hasMore: service.hasMore(),
    loadError: service.loadError(),
  };
};

describe('ListStore', () => {
  it('should have the expected initial state', () => {
    const { service } = setup();
    const serviceState = getServiceState(service);
    expect(serviceState.list).toStrictEqual([]);
    expect(serviceState.loadError).toBe('');
    expect(serviceState.hasMore).toBe(false);
    expect(serviceState.loading).toBe(false);
  });

  it('should reset the state', () => {
    const { service } = setup();
    service.hasMore.set(true);
    service.loading.set(true);
    service.list.set([1, 2, 3]);
    service.loadError.set('blah');
    service.reset();
    const serviceState = getServiceState(service);
    expect(serviceState.list).toStrictEqual([]);
    expect(serviceState.loadError).toBe('');
    expect(serviceState.hasMore).toBe(false);
    expect(serviceState.loading).toBe(false);
  });

  it('should load data', () => {
    vi.useFakeTimers();
    const data = [1, 2, 3];
    dataReqMock.mockImplementationOnce(() => of(data).pipe(observeOn(asyncScheduler, 0)));
    const { service } = setup();
    service.load();
    const serviceLoadingState = getServiceState(service);
    vi.runAllTimers();
    const serviceFinalState = getServiceState(service);
    expect(serviceLoadingState.loadError).toBe('');
    expect(serviceLoadingState.loading).toBe(true);
    expect(serviceLoadingState.hasMore).toBe(false);
    expect(serviceLoadingState.list).toStrictEqual([]);
    expect(serviceFinalState.list).toStrictEqual(data);
    expect(serviceFinalState.loading).toBe(false);
    expect(serviceFinalState.hasMore).toBe(true);
    expect(serviceFinalState.loadError).toBe('');
    vi.useRealTimers();
  });

  it('should fail to load data', () => {
    vi.useFakeTimers();
    dataReqMock.mockImplementationOnce(() =>
      throwError(() => new Error('Test load error')).pipe(observeOn(asyncScheduler, 0))
    );
    const { service } = setup();
    service.load();
    const serviceLoadingState = getServiceState(service);
    vi.runAllTimers();
    const serviceFinalState = getServiceState(service);
    expect(serviceLoadingState.loadError).toBe('');
    expect(serviceLoadingState.loading).toBe(true);
    expect(serviceLoadingState.hasMore).toBe(false);
    expect(serviceLoadingState.list).toStrictEqual([]);
    expect(serviceFinalState.loadError).toBe(testErrMsg);
    expect(serviceFinalState.list).toStrictEqual([]);
    expect(serviceFinalState.loading).toBe(false);
    expect(serviceFinalState.hasMore).toBe(false);
    vi.useRealTimers();
  });

  it('should load more data', () => {
    vi.useFakeTimers();
    const data = [1, 2, 3, 4, 5, 6];
    const extraData = data.slice(3);
    const initData = data.slice(0, 3);
    dataReqMock.mockImplementationOnce(() => of(extraData).pipe(observeOn(asyncScheduler, 0)));
    const { service } = setup();
    service.list.set(initData);
    service.load();
    const serviceLoadingState = getServiceState(service);
    vi.runAllTimers();
    const serviceFinalState = getServiceState(service);
    expect(serviceLoadingState.loadError).toBe('');
    expect(serviceLoadingState.hasMore).toBe(false);
    expect(serviceLoadingState.loading).toBe(true);
    expect(serviceLoadingState.list).toStrictEqual(initData);
    expect(serviceFinalState.list).toStrictEqual(data);
    expect(serviceFinalState.loading).toBe(false);
    expect(serviceFinalState.hasMore).toBe(true);
    expect(serviceFinalState.loadError).toBe('');
    vi.useRealTimers();
  });

  it('should fail load more data', () => {
    vi.useFakeTimers();
    const initData = [1, 2, 3];
    dataReqMock.mockImplementationOnce(() =>
      throwError(() => new Error('Test load error')).pipe(observeOn(asyncScheduler, 0))
    );
    const { service } = setup();
    service.list.set(initData);
    service.hasMore.set(true);
    service.load();
    const serviceLoadingState = getServiceState(service);
    vi.runAllTimers();
    const serviceFinalState = getServiceState(service);
    expect(serviceLoadingState.loadError).toBe('');
    expect(serviceLoadingState.hasMore).toBe(true);
    expect(serviceLoadingState.loading).toBe(true);
    expect(serviceLoadingState.list).toStrictEqual(initData);
    expect(serviceFinalState.list).toStrictEqual(initData);
    expect(serviceFinalState.loadError).toBe(testErrMsg);
    expect(serviceFinalState.loading).toBe(false);
    expect(serviceFinalState.hasMore).toBe(true);
    vi.useRealTimers();
  });
});
