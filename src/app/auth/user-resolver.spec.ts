import { TestBed } from '@angular/core/testing';
import { userResolver } from './user-resolver';
import { ActivatedRouteSnapshot, ResolveFn, RouterStateSnapshot } from '@angular/router';
import { AuthData } from './auth.types';
import { Auth } from './auth';
import { Mock } from 'vitest';

const setup = (userMock: Mock) => {
  const executeResolver: ResolveFn<AuthData['user']> = (...resolverParameters) => {
    return TestBed.runInInjectionContext(() => userResolver(...resolverParameters));
  };
  TestBed.configureTestingModule({ providers: [{ provide: Auth, useValue: { user: userMock } }] });
  return { executeResolver };
};

const resolverArgs = [{} as ActivatedRouteSnapshot, {} as RouterStateSnapshot] as const;

describe('userResolver', () => {
  it('should be return the auth user', () => {
    const authUser = { id: crypto.randomUUID() };
    const { executeResolver } = setup(vi.fn(() => authUser));
    expect(executeResolver(...resolverArgs)).toStrictEqual(authUser);
  });

  it('should throw error on a falsy auth user', () => {
    for (const authUser of [undefined, null, false, '', 0]) {
      const { executeResolver } = setup(vi.fn(() => authUser));
      expect(() => executeResolver(...resolverArgs)).toThrowError();
      TestBed.resetTestingModule();
    }
  });
});
