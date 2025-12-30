import { ActivatedRouteSnapshot, ResolveFn, RouterStateSnapshot } from '@angular/router';
import { firstValueFrom, isObservable, of } from 'rxjs';
import { profileResolver } from './profile-resolver';
import { TestBed } from '@angular/core/testing';
import { Profile } from '../app.types';
import { Profiles } from './profiles';

const profilesMock = { getProfile: vi.fn() };

const setup = () => {
  const executeResolver: ResolveFn<Profile> = (...resolverParameters) =>
    TestBed.runInInjectionContext(() => profileResolver(...resolverParameters));

  TestBed.configureTestingModule({ providers: [{ provide: Profiles, useValue: profilesMock }] });

  return { executeResolver };
};

const createResolverArgs = (firstArg = {}, secondArg = {}) => {
  return [firstArg as ActivatedRouteSnapshot, secondArg as RouterStateSnapshot] as const;
};

describe('profileResolver', () => {
  afterEach(vi.resetAllMocks);

  it('should return an observer of a profile', async () => {
    const profile = { id: crypto.randomUUID(), foo: 'bar' };
    profilesMock.getProfile.mockImplementation(() => of(profile));
    const { executeResolver } = setup();
    const result$ = executeResolver(...createResolverArgs({ params: { profileId: profile.id } }));
    const result = isObservable(result$) ? await firstValueFrom(result$) : await result$;
    expect(profilesMock.getProfile).toHaveBeenCalledExactlyOnceWith(profile.id);
    expect(result).toBe(profile);
  });

  it('should throw if the `params` missing a `profileId`', async () => {
    const { executeResolver } = setup();
    expect(() => executeResolver(...createResolverArgs({ params: {} }))).toThrowError(
      /missing .*profile ?id/i
    );
  });
});
