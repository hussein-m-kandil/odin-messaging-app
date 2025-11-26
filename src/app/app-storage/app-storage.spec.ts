import { TestBed } from '@angular/core/testing';

import { AppStorage } from './app-storage';

const setup = () => {
  TestBed.configureTestingModule({});
  const service = TestBed.inject(AppStorage);
  return { service };
};

const mockErrorLogger = () => {
  const errorLoggerMock = vi.fn();
  const errorLoggerSpy = vi.spyOn(console, 'error');
  errorLoggerSpy.mockImplementationOnce(errorLoggerMock);
  return { errorLoggerSpy, errorLoggerMock };
};

const key = 'test-key';
const value = 'test-value';

describe('AppStorage', () => {
  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('should store an item on the local storage', () => {
    const storageSetItemSpy = vi.spyOn(Storage.prototype, 'setItem');
    const { service } = setup();
    expect(service.setItem(key, value)).toBeUndefined();
    expect(storageSetItemSpy).toHaveBeenCalledExactlyOnceWith(key, value);
    expect(localStorage.getItem(key)).toBe(value);
  });

  it('should replace a stored item on the local storage', () => {
    localStorage.setItem(key, value);
    const otherValue = 'other-test-value';
    const storageSetItemSpy = vi.spyOn(Storage.prototype, 'setItem');
    const { service } = setup();
    expect(service.setItem(key, otherValue)).toBeUndefined();
    expect(storageSetItemSpy).toHaveBeenCalledExactlyOnceWith(key, otherValue);
    expect(localStorage.getItem(key)).toBe(otherValue);
  });

  it('should catch the thrown error, and store nothing', () => {
    const { errorLoggerMock } = mockErrorLogger();
    const storageSetItemSpy = vi.spyOn(Storage.prototype, 'setItem');
    storageSetItemSpy.mockImplementationOnce(() => {
      throw new Error('Local storage `setItem` error.');
    });
    const { service } = setup();
    expect(service.setItem(key, value)).toBeUndefined();
    expect(storageSetItemSpy).toHaveBeenCalledExactlyOnceWith(key, value);
    expect(errorLoggerMock).toHaveBeenCalledOnce();
    expect(localStorage.getItem(key)).toBeNull();
  });

  it('should get a stored item from the local storage', () => {
    localStorage.setItem(key, value);
    const storageGetItemSpy = vi.spyOn(Storage.prototype, 'getItem');
    const { service } = setup();
    expect(service.getItem(key)).toBe(value);
    expect(storageGetItemSpy).toHaveBeenCalledExactlyOnceWith(key);
    expect(localStorage.getItem(key)).toBe(value);
  });

  it('should catch the thrown error and return null', () => {
    localStorage.setItem(key, value);
    const { errorLoggerMock } = mockErrorLogger();
    const storageGetItemSpy = vi.spyOn(Storage.prototype, 'getItem');
    storageGetItemSpy.mockImplementationOnce(() => {
      throw new Error('Local storage `getItem` error.');
    });
    const { service } = setup();
    expect(service.getItem(key)).toBeNull();
    expect(storageGetItemSpy).toHaveBeenCalledExactlyOnceWith(key);
    expect(errorLoggerMock).toHaveBeenCalledOnce();
    expect(localStorage.getItem(key)).toBe(value);
  });

  it('should remove a stored item from the local storage', () => {
    localStorage.setItem(key, value);
    const storageRemoveItemSpy = vi.spyOn(Storage.prototype, 'removeItem');
    const { service } = setup();
    expect(service.removeItem(key)).toBeUndefined();
    expect(storageRemoveItemSpy).toHaveBeenCalledExactlyOnceWith(key);
    expect(localStorage.getItem(key)).toBeNull();
  });

  it('should catch the thrown error, and remove nothing', () => {
    localStorage.setItem(key, value);
    const { errorLoggerMock } = mockErrorLogger();
    const storageRemoveItemSpy = vi.spyOn(Storage.prototype, 'removeItem');
    storageRemoveItemSpy.mockImplementationOnce(() => {
      throw new Error('Local storage `removeItem` error.');
    });
    const { service } = setup();
    expect(service.removeItem(key)).toBeUndefined();
    expect(storageRemoveItemSpy).toHaveBeenCalledExactlyOnceWith(key);
    expect(errorLoggerMock).toHaveBeenCalledOnce();
    expect(localStorage.getItem(key)).toBe(value);
  });
});
