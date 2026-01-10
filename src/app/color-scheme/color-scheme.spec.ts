import { ColorScheme, DARK_SCHEME_CN, initColorScheme, SCHEMES } from './color-scheme';
import { TestBed, TestModuleMetadata } from '@angular/core/testing';
import { provideAppInitializer } from '@angular/core';
import { AppStorage } from '../app-storage';

const appStorageMock = {
  removeItem: vi.fn<(k: string) => void>(),
  getItem: vi.fn<(k: string) => string | null>(() => null),
  setItem: vi.fn<(key: string, value: string) => void>((_, value) => {
    if (typeof value !== 'string') throw new TypeError('Expect a string value.');
  }),
};

const setup = ({ providers, ...restModuleDefs }: TestModuleMetadata = {}) => {
  TestBed.configureTestingModule({
    providers: [{ provide: AppStorage, useValue: appStorageMock }, ...(providers || [])],
    ...restModuleDefs,
  });
  const service = TestBed.inject(ColorScheme);
  return { service };
};

describe('ColorScheme', () => {
  afterEach(vi.resetAllMocks);

  it('should have the first scheme initially, and not use the app storage', () => {
    const { service } = setup();
    TestBed.tick();
    expect(service.selectedScheme()).toBe(SCHEMES[0]);
    expect(appStorageMock.setItem).toHaveBeenCalledTimes(0);
    expect(appStorageMock.getItem).toHaveBeenCalledTimes(0);
    expect(appStorageMock.removeItem).toHaveBeenCalledTimes(0);
  });

  it('should be fine if `matchMedia` is not supported', () => {
    vi.stubGlobal('matchMedia', undefined);
    const { service } = setup();
    TestBed.tick();
    expect(service.selectedScheme()).toBe(SCHEMES[0]);
    expect(appStorageMock.setItem).toHaveBeenCalledTimes(0);
    expect(appStorageMock.getItem).toHaveBeenCalledTimes(0);
    expect(appStorageMock.removeItem).toHaveBeenCalledTimes(0);
    vi.unstubAllGlobals();
  });

  it('should match the system scheme', () => {
    const addEventListener = vi.fn();
    const removeEventListener = vi.fn();
    vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener, removeEventListener }));
    const matchMediaSpy = vi.spyOn(window, 'matchMedia');
    const { service } = setup();
    TestBed.tick();
    expect(service.selectedScheme()).toBe(SCHEMES[0]);
    expect(matchMediaSpy).toHaveBeenCalledTimes(1);
    expect(addEventListener).toHaveBeenCalledTimes(1);
    expect(removeEventListener).toHaveBeenCalledTimes(0);
    expect(appStorageMock.setItem).toHaveBeenCalledTimes(0);
    expect(appStorageMock.getItem).toHaveBeenCalledTimes(0);
    expect(appStorageMock.removeItem).toHaveBeenCalledTimes(0);
    expect(document.querySelector(`.${DARK_SCHEME_CN}`)).toBeTruthy();
    vi.unstubAllGlobals();
  });

  it('should handle changes in the system scheme', () => {
    const removeEventListener = vi.fn();
    let matchMediaChangeHandler!: (event: { matches: boolean }) => void;
    const addEventListener = vi.fn((_, handler) => (matchMediaChangeHandler = handler));
    vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener, removeEventListener }));
    const matchMediaSpy = vi.spyOn(window, 'matchMedia');
    const { service } = setup();
    TestBed.tick();
    matchMediaChangeHandler({ matches: false });
    expect(service.selectedScheme()).toBe(SCHEMES[0]);
    expect(matchMediaSpy).toHaveBeenCalledTimes(1);
    expect(addEventListener).toHaveBeenCalledTimes(1);
    expect(removeEventListener).toHaveBeenCalledTimes(0);
    expect(appStorageMock.setItem).toHaveBeenCalledTimes(0);
    expect(appStorageMock.getItem).toHaveBeenCalledTimes(0);
    expect(appStorageMock.removeItem).toHaveBeenCalledTimes(0);
    expect(document.querySelector(`.${DARK_SCHEME_CN}`)).toBeNull();
    vi.unstubAllGlobals();
  });

  it('should stop handling changes in the system scheme after switching the scheme', () => {
    const addEventListener = vi.fn();
    const removeEventListener = vi.fn();
    vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener, removeEventListener }));
    const matchMediaSpy = vi.spyOn(window, 'matchMedia');
    const { service } = setup();
    TestBed.tick();
    service.switch();
    TestBed.tick();
    expect(service.selectedScheme()).toBe(SCHEMES[1]);
    expect(matchMediaSpy).toHaveBeenCalledTimes(1);
    expect(addEventListener).toHaveBeenCalledTimes(1);
    expect(removeEventListener).toHaveBeenCalledTimes(1);
    expect(appStorageMock.setItem).toHaveBeenCalledTimes(1);
    expect(appStorageMock.getItem).toHaveBeenCalledTimes(0);
    expect(appStorageMock.removeItem).toHaveBeenCalledTimes(0);
    expect(document.querySelector(`.${DARK_SCHEME_CN}`)).toBeNull();
    vi.unstubAllGlobals();
  });

  it('should restore a saved scheme on app initialization', () => {
    appStorageMock.getItem.mockImplementation(() => SCHEMES[2].value);
    const { service } = setup({ providers: [provideAppInitializer(initColorScheme)] });
    TestBed.tick();
    expect(service.selectedScheme()).toBe(SCHEMES[2]);
    expect(appStorageMock.setItem).toHaveBeenCalledTimes(0);
    expect(appStorageMock.getItem).toHaveBeenCalledTimes(1);
    expect(appStorageMock.removeItem).toHaveBeenCalledTimes(0);
  });

  it('should not restore a saved scheme on app initialization if nothing is saved', () => {
    const { service } = setup({ providers: [provideAppInitializer(initColorScheme)] });
    TestBed.tick();
    expect(service.selectedScheme()).toBe(SCHEMES[0]);
    expect(appStorageMock.setItem).toHaveBeenCalledTimes(0);
    expect(appStorageMock.getItem).toHaveBeenCalledTimes(1);
    expect(appStorageMock.removeItem).toHaveBeenCalledTimes(0);
  });

  it('should not restore a saved scheme on app initialization, and remove the invalid saved value', () => {
    appStorageMock.getItem.mockImplementation(() => 'invalid-scheme-value');
    const { service } = setup({ providers: [provideAppInitializer(initColorScheme)] });
    TestBed.tick();
    expect(service.selectedScheme()).toBe(SCHEMES[0]);
    expect(appStorageMock.setItem).toHaveBeenCalledTimes(0);
    expect(appStorageMock.getItem).toHaveBeenCalledTimes(1);
    expect(appStorageMock.removeItem).toHaveBeenCalledTimes(1);
  });

  it('should save the current scheme', () => {
    const { service } = setup();
    TestBed.tick();
    service.save();
    TestBed.tick();
    expect(service.selectedScheme()).toBe(SCHEMES[0]);
    expect(appStorageMock.setItem).toHaveBeenCalledTimes(1);
    expect(appStorageMock.getItem).toHaveBeenCalledTimes(0);
    expect(appStorageMock.removeItem).toHaveBeenCalledTimes(0);
    expect(appStorageMock.setItem.mock.calls[0][1]).toBe(SCHEMES[0].value);
  });

  it('should select the given scheme', () => {
    const { service } = setup();
    TestBed.tick();
    service.select(SCHEMES[1]);
    TestBed.tick();
    expect(service.selectedScheme()).toBe(SCHEMES[1]);
    expect(appStorageMock.setItem).toHaveBeenCalledTimes(1);
    expect(appStorageMock.getItem).toHaveBeenCalledTimes(0);
    expect(appStorageMock.removeItem).toHaveBeenCalledTimes(0);
    expect(appStorageMock.setItem.mock.calls[0][1]).toBe(SCHEMES[1].value);
  });

  it('should have the second scheme after switching once', () => {
    const { service } = setup();
    TestBed.tick();
    service.switch();
    TestBed.tick();
    expect(service.selectedScheme()).toBe(SCHEMES[1]);
    expect(appStorageMock.setItem).toHaveBeenCalledTimes(1);
    expect(appStorageMock.getItem).toHaveBeenCalledTimes(0);
    expect(appStorageMock.removeItem).toHaveBeenCalledTimes(0);
    expect(appStorageMock.setItem.mock.calls[0][1]).toBe(SCHEMES[1].value);
  });

  it('should have the third scheme after switching twice', () => {
    const { service } = setup();
    TestBed.tick();
    service.switch();
    TestBed.tick();
    service.switch();
    TestBed.tick();
    expect(service.selectedScheme()).toBe(SCHEMES[2]);
    expect(appStorageMock.setItem).toHaveBeenCalledTimes(2);
    expect(appStorageMock.getItem).toHaveBeenCalledTimes(0);
    expect(appStorageMock.removeItem).toHaveBeenCalledTimes(0);
    expect(appStorageMock.setItem.mock.calls[0][1]).toBe(SCHEMES[1].value);
    expect(appStorageMock.setItem.mock.calls[1][1]).toBe(SCHEMES[2].value);
  });

  it('should have the first scheme after switching three times', () => {
    const { service } = setup();
    service.switch();
    TestBed.tick();
    service.switch();
    TestBed.tick();
    service.switch();
    TestBed.tick();
    expect(service.selectedScheme()).toBe(SCHEMES[0]);
    expect(appStorageMock.setItem).toHaveBeenCalledTimes(3);
    expect(appStorageMock.getItem).toHaveBeenCalledTimes(0);
    expect(appStorageMock.removeItem).toHaveBeenCalledTimes(0);
    expect(appStorageMock.setItem.mock.calls[0][1]).toBe(SCHEMES[1].value);
    expect(appStorageMock.setItem.mock.calls[1][1]).toBe(SCHEMES[2].value);
    expect(appStorageMock.setItem.mock.calls[2][1]).toBe(SCHEMES[0].value);
  });

  it('should have the second scheme after switching four times', () => {
    const { service } = setup();
    service.switch();
    TestBed.tick();
    service.switch();
    TestBed.tick();
    service.switch();
    TestBed.tick();
    service.switch();
    TestBed.tick();
    expect(service.selectedScheme()).toBe(SCHEMES[1]);
    expect(appStorageMock.setItem).toHaveBeenCalledTimes(4);
    expect(appStorageMock.getItem).toHaveBeenCalledTimes(0);
    expect(appStorageMock.removeItem).toHaveBeenCalledTimes(0);
    expect(appStorageMock.setItem.mock.calls[0][1]).toBe(SCHEMES[1].value);
    expect(appStorageMock.setItem.mock.calls[1][1]).toBe(SCHEMES[2].value);
    expect(appStorageMock.setItem.mock.calls[2][1]).toBe(SCHEMES[0].value);
    expect(appStorageMock.setItem.mock.calls[3][1]).toBe(SCHEMES[1].value);
  });

  it('should have the second scheme after switching five times', () => {
    const { service } = setup();
    service.switch();
    TestBed.tick();
    service.switch();
    TestBed.tick();
    service.switch();
    TestBed.tick();
    service.switch();
    TestBed.tick();
    service.switch();
    TestBed.tick();
    expect(service.selectedScheme()).toBe(SCHEMES[2]);
    expect(appStorageMock.setItem).toHaveBeenCalledTimes(5);
    expect(appStorageMock.getItem).toHaveBeenCalledTimes(0);
    expect(appStorageMock.removeItem).toHaveBeenCalledTimes(0);
    expect(appStorageMock.setItem.mock.calls[0][1]).toBe(SCHEMES[1].value);
    expect(appStorageMock.setItem.mock.calls[1][1]).toBe(SCHEMES[2].value);
    expect(appStorageMock.setItem.mock.calls[2][1]).toBe(SCHEMES[0].value);
    expect(appStorageMock.setItem.mock.calls[3][1]).toBe(SCHEMES[1].value);
    expect(appStorageMock.setItem.mock.calls[4][1]).toBe(SCHEMES[2].value);
  });

  it('should have the second scheme after switching six times', () => {
    const { service } = setup();
    service.switch();
    TestBed.tick();
    service.switch();
    TestBed.tick();
    service.switch();
    TestBed.tick();
    service.switch();
    TestBed.tick();
    service.switch();
    TestBed.tick();
    service.switch();
    TestBed.tick();
    expect(service.selectedScheme()).toBe(SCHEMES[0]);
    expect(appStorageMock.setItem).toHaveBeenCalledTimes(6);
    expect(appStorageMock.getItem).toHaveBeenCalledTimes(0);
    expect(appStorageMock.removeItem).toHaveBeenCalledTimes(0);
    expect(appStorageMock.setItem.mock.calls[0][1]).toBe(SCHEMES[1].value);
    expect(appStorageMock.setItem.mock.calls[1][1]).toBe(SCHEMES[2].value);
    expect(appStorageMock.setItem.mock.calls[2][1]).toBe(SCHEMES[0].value);
    expect(appStorageMock.setItem.mock.calls[3][1]).toBe(SCHEMES[1].value);
    expect(appStorageMock.setItem.mock.calls[4][1]).toBe(SCHEMES[2].value);
    expect(appStorageMock.setItem.mock.calls[5][1]).toBe(SCHEMES[0].value);
  });
});
