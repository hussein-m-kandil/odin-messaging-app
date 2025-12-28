import { render, RenderComponentOptions, screen } from '@testing-library/angular';
import { userEvent } from '@testing-library/user-event';
import { Component } from '@angular/core';
import { Profiles } from '../profiles';
import { of, throwError } from 'rxjs';
import { Profile } from './profile';

const profile = { id: crypto.randomUUID(), user: { username: 'test_user', fullname: 'Test User' } };

const profilesMock = { getProfile: vi.fn() };

@Component({ selector: 'app-profile-test', template: '<div>Profile Test</div>' })
class component {}

const renderComponent = ({
  providers,
  routes,
  ...options
}: RenderComponentOptions<Profile> = {}) => {
  return render(Profile, {
    providers: [{ provide: Profiles, useValue: profilesMock }, ...(providers || [])],
    routes: routes || [{ path: '**', component }],
    ...options,
  });
};

describe('Profile', () => {
  afterEach(vi.resetAllMocks);

  it('should render loading indicator', async () => {
    await renderComponent();
    expect(screen.getByLabelText(/loading profile/i)).toBeVisible();
    expect(screen.queryByRole('heading')).toBeNull();
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.queryByText(/failed/i)).toBeNull();
    expect(screen.queryByRole('button', { name: /retry/i })).toBeNull();
  });

  it('should render the given profile data', async () => {
    profilesMock.getProfile.mockImplementation(() => of(profile));
    await renderComponent({ inputs: { profileId: profile.id } });
    expect(profilesMock.getProfile).toHaveBeenCalledExactlyOnceWith(profile.id);
    expect(screen.getByRole('heading', { name: new RegExp(profile.user.fullname) })).toBeVisible();
    expect(screen.getByText(profile.user.username[0].toUpperCase())).toBeVisible();
    expect(screen.getByText(new RegExp(profile.user.username))).toBeVisible();
    expect(
      screen.getByRole('link', { name: new RegExp(`chat with ${profile.user.username}`, 'i') })
    ).toBeVisible();
    expect(screen.queryByRole('button', { name: /retry/i })).toBeNull();
    expect(screen.queryByLabelText(/loading profile/i)).toBeNull();
    expect(screen.queryByText(/failed/i)).toBeNull();
  });

  it('should render an error message and a retry-button', async () => {
    profilesMock.getProfile.mockImplementation(() => throwError(() => new Error('Profile err')));
    await renderComponent({ inputs: { profileId: profile.id } });
    expect(profilesMock.getProfile).toHaveBeenCalledExactlyOnceWith(profile.id);
    expect(screen.getByRole('button', { name: /retry/i })).toBeVisible();
    expect(screen.queryByLabelText(/loading profile/i)).toBeNull();
    expect(screen.getByText(/failed/i)).toBeVisible();
    expect(screen.queryByRole('heading')).toBeNull();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('should retry loading the profile', async () => {
    const { click } = userEvent.setup();
    profilesMock.getProfile.mockImplementation(() => throwError(() => new Error('Profile err')));
    await renderComponent({ inputs: { profileId: profile.id }, autoDetectChanges: false });
    await click(screen.getByRole('button', { name: /retry/i }));
    expect(profilesMock.getProfile).toHaveBeenCalledTimes(2);
    expect(profilesMock.getProfile).toHaveBeenNthCalledWith(1, profile.id);
    expect(profilesMock.getProfile).toHaveBeenNthCalledWith(2, profile.id);
  });

  it('should reload the profile on changing the `profileId` input', async () => {
    const profile2 = {
      ...profile,
      id: crypto.randomUUID(),
      user: { ...profile.user, username: 'test_user_2', fullname: 'Test User #2' },
    };
    profilesMock.getProfile.mockImplementation(() => of(profile, profile2));
    const { rerender } = await renderComponent({ inputs: { profileId: profile.id } });
    await rerender({ inputs: { profileId: profile2.id }, partialUpdate: true });
    expect(profilesMock.getProfile).toHaveBeenCalledTimes(2);
    expect(profilesMock.getProfile).toHaveBeenNthCalledWith(1, profile.id);
    expect(profilesMock.getProfile).toHaveBeenNthCalledWith(2, profile2.id);
    expect(screen.getByRole('heading', { name: new RegExp(profile2.user.fullname) })).toBeVisible();
    expect(screen.getByText(profile2.user.username[0].toUpperCase())).toBeVisible();
    expect(screen.getByText(new RegExp(profile2.user.username))).toBeVisible();
    expect(
      screen.getByRole('link', { name: new RegExp(`chat with ${profile2.user.username}`, 'i') })
    ).toBeVisible();
    expect(screen.queryByRole('button', { name: /retry/i })).toBeNull();
    expect(screen.queryByLabelText(/loading profile/i)).toBeNull();
    expect(screen.queryByText(/failed/i)).toBeNull();
  });

  it('should not reload the profile on changing an input other than the `profileId`', async () => {
    profilesMock.getProfile.mockImplementation(() => of(profile, profile));
    const { rerender } = await renderComponent({ inputs: { profileId: profile.id } });
    await rerender({ inputs: { user: profile.user }, partialUpdate: true });
    expect(profilesMock.getProfile).toHaveBeenCalledExactlyOnceWith(profile.id);
    expect(screen.getByRole('heading', { name: new RegExp(profile.user.fullname) })).toBeVisible();
    expect(screen.getByText(profile.user.username[0].toUpperCase())).toBeVisible();
    expect(screen.getByText(new RegExp(profile.user.username))).toBeVisible();
    expect(
      screen.getByRole('link', { name: new RegExp(`chat with ${profile.user.username}`, 'i') })
    ).toBeVisible();
    expect(screen.queryByRole('button', { name: /retry/i })).toBeNull();
    expect(screen.queryByLabelText(/loading profile/i)).toBeNull();
    expect(screen.queryByText(/failed/i)).toBeNull();
  });
});
