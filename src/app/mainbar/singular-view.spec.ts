import { TestBed } from '@angular/core/testing';

import { SingularView } from './singular-view';

const setup = () => {
  TestBed.configureTestingModule({});
  const service = TestBed.inject(SingularView);
  return { service };
};

const getState = (service: SingularView) => {
  return { enabled: service.enabled(), disabled: service.disabled() };
};

describe('SingularView', () => {
  it('should be disabled by default', () => {
    const { service } = setup();
    const { enabled, disabled } = getState(service);
    expect(enabled).toBe(false);
    expect(disabled).toBe(true);
  });

  it('should enable by default', () => {
    const { service } = setup();
    service.enable();
    const { enabled, disabled } = getState(service);
    expect(enabled).toBe(true);
    expect(disabled).toBe(false);
  });

  it('should disable by default', () => {
    const { service } = setup();
    service.disable();
    const { enabled, disabled } = getState(service);
    expect(enabled).toBe(false);
    expect(disabled).toBe(true);
  });

  it('should toggle', () => {
    const { service } = setup();
    service.toggle();
    const stateAfterFirstToggle = getState(service);
    service.toggle();
    const stateAfterSecondToggle = getState(service);
    service.toggle();
    const stateAfterThirdToggle = getState(service);
    expect(stateAfterFirstToggle.enabled).toBe(true);
    expect(stateAfterFirstToggle.disabled).toBe(false);
    expect(stateAfterSecondToggle.enabled).toBe(false);
    expect(stateAfterSecondToggle.disabled).toBe(true);
    expect(stateAfterThirdToggle.enabled).toBe(true);
    expect(stateAfterThirdToggle.disabled).toBe(false);
  });
});
