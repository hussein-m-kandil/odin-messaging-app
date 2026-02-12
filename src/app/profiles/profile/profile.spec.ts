import { render, RenderComponentOptions, screen } from '@testing-library/angular';
import { Profile as ProfileT, User } from '../../app.types';
import { userEvent } from '@testing-library/user-event';
import { MessageService } from 'primeng/api';
import { Profiles } from '../profiles';
import { Profile } from './profile';
import { Observable, of, Subscriber } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';

const user = {
  id: crypto.randomUUID(),
  username: 'test_user',
  fullname: 'Test User',
  bio: 'Test bio.',
} as User;

const profile: ProfileT = {
  id: crypto.randomUUID(),
  user,
  visible: true,
  tangible: true,
  followedByCurrentUser: false,
  lastSeen: new Date().toISOString(),
};

user.profile = profile;

const profilesMock = {
  isOnline: vi.fn(() => of(true)),
  list: vi.fn(() => [] as ProfileT[]),
  isCurrentProfile: vi.fn(() => false),
  toggleFollowing: vi.fn(() => of('')),
  updateCurrentProfile: vi.fn(() => of('')),
};

const navigationSpy = vi.spyOn(Router.prototype, 'navigate');

const renderComponent = ({
  inputs,
  providers,
  ...options
}: RenderComponentOptions<Profile> = {}) => {
  return render(Profile, {
    providers: [
      { provide: Profiles, useValue: profilesMock },
      MessageService,
      ...(providers || []),
    ],
    inputs: { profile, ...inputs },
    autoDetectChanges: false,
    ...options,
  });
};

const assertNavBtnsEnabled = (...extraNodes: Node[]) => {
  expect(screen.getByRole('button', { name: /back/i })).toBeEnabled();
  expect(screen.getByRole('button', { name: /chat/i })).toBeEnabled();
  for (const node of extraNodes) expect(node).toBeEnabled();
};

const assertNavigated = () => {
  expect(navigationSpy).toHaveBeenCalledTimes(1);
  expect(navigationSpy.mock.calls[0][0]).toStrictEqual(['.']);
  expect(navigationSpy.mock.calls[0][1]).toHaveProperty('relativeTo');
  expect(navigationSpy.mock.calls[0][1]).toHaveProperty('replaceUrl', true);
  expect(navigationSpy.mock.calls[0][1]).toHaveProperty('onSameUrlNavigation', 'reload');
  expect((navigationSpy.mock.calls[0][1] as Record<string, unknown>)['relativeTo']).toBeInstanceOf(
    ActivatedRoute,
  );
};

describe('Profile', () => {
  afterEach(vi.resetAllMocks);

  it('should render non-current, followed profile', async () => {
    profilesMock.isCurrentProfile.mockImplementation(() => false);
    await renderComponent({ inputs: { profile: { ...profile, followedByCurrentUser: true } } });
    expect(screen.getByRole('heading', { name: new RegExp(profile.user.fullname) })).toBeVisible();
    expect(screen.getByText(profile.user.username[0].toUpperCase())).toBeVisible();
    expect(screen.getByText(new RegExp(profile.user.username))).toBeVisible();
    expect(screen.getByText(new RegExp(profile.user.bio))).toBeVisible();
    expect(screen.getByRole('button', { name: /back/i })).toBeVisible();
    expect(screen.queryByRole('button', { name: /toggle profile options/i })).toBeNull();
    expect(
      screen.getByRole('button', { name: new RegExp(`chat with ${profile.user.username}`, 'i') }),
    ).toBeVisible();
    expect(screen.queryByRole('switch', { name: /active status/i })).toBeNull();
    expect(screen.queryByRole('switch', { name: /read receipt/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /^unfollow/i })).toBeVisible();
    expect(screen.queryByRole('button', { name: /^follow/i })).toBeNull();
  });

  it('should render non-current, non-followed profile', async () => {
    profilesMock.isCurrentProfile.mockImplementation(() => false);
    await renderComponent({ inputs: { profile: { ...profile, followedByCurrentUser: false } } });
    expect(screen.getByRole('heading', { name: new RegExp(profile.user.fullname) })).toBeVisible();
    expect(screen.getByText(profile.user.username[0].toUpperCase())).toBeVisible();
    expect(screen.getByText(new RegExp(profile.user.username))).toBeVisible();
    expect(screen.getByText(new RegExp(profile.user.bio))).toBeVisible();
    expect(screen.getByRole('button', { name: /back/i })).toBeVisible();
    expect(screen.queryByRole('button', { name: /toggle profile options/i })).toBeNull();
    expect(
      screen.getByRole('button', { name: new RegExp(`chat with ${profile.user.username}`, 'i') }),
    ).toBeVisible();
    expect(screen.queryByRole('switch', { name: /active status/i })).toBeNull();
    expect(screen.queryByRole('switch', { name: /read receipt/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /^follow/i })).toBeVisible();
    expect(screen.queryByRole('button', { name: /^unfollow/i })).toBeNull();
  });

  it('should render the current profile data', async () => {
    profilesMock.isCurrentProfile.mockImplementation(() => true);
    await renderComponent();
    expect(screen.getByRole('heading', { name: new RegExp(profile.user.fullname) })).toBeVisible();
    expect(screen.getByText(profile.user.username[0].toUpperCase())).toBeVisible();
    expect(screen.getByText(new RegExp(profile.user.username))).toBeVisible();
    expect(screen.getByText(new RegExp(profile.user.bio))).toBeVisible();
    expect(screen.getByRole('button', { name: /back/i })).toBeVisible();
    expect(screen.getByRole('button', { name: /chat with yourself/i })).toBeVisible();
    expect(screen.getByRole('button', { name: /toggle profile options/i })).toBeVisible();
    expect(screen.queryByRole('switch', { name: /active status/i })).toBeInTheDocument();
    expect(screen.queryByRole('switch', { name: /read receipt/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^unfollow/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /^follow/i })).toBeNull();
  });

  it('should render a button that toggles the current profile options menu', async () => {
    profilesMock.isCurrentProfile.mockImplementation(() => true);
    const actor = userEvent.setup();
    await renderComponent();
    await actor.click(screen.getByRole('button', { name: /toggle profile options/i }));
    await vi.waitFor(() =>
      expect(screen.getByRole('menu', { name: /profile options/i })).toBeVisible(),
    );
    expect(screen.getByRole('link', { name: /edit profile/i })).toBeVisible();
    expect(screen.getByRole('link', { name: /edit profile/i })).toHaveAttribute('href', '/edit');
    expect(screen.getByRole('link', { name: /upload picture/i })).toBeVisible();
    expect(screen.getByRole('link', { name: /upload picture/i })).toHaveAttribute('href', '/pic');
    expect(screen.getByRole('link', { name: /delete profile/i })).toBeVisible();
    expect(screen.getByRole('link', { name: /delete profile/i })).toHaveAttribute(
      'href',
      '/delete',
    );
    expect(screen.queryByRole('link', { name: /delete picture/i })).toBeNull();
    await actor.click(screen.getByRole('button', { name: /toggle profile options/i }));
    await vi.waitFor(() =>
      expect(screen.queryByRole('menu', { name: /profile options/i })).toBeNull(),
    );
    expect(screen.queryByRole('link', { name: /edit profile/i })).toBeNull();
    expect(screen.queryByRole('link', { name: /upload picture/i })).toBeNull();
    expect(screen.queryByRole('link', { name: /delete profile/i })).toBeNull();
    expect(screen.queryByRole('link', { name: /delete picture/i })).toBeNull();
  });

  it('should render a delete-picture option', async () => {
    profilesMock.isCurrentProfile.mockImplementation(() => true);
    const actor = userEvent.setup();
    const testProfile = {
      ...profile,
      user: { ...user, avatar: { image: { id: crypto.randomUUID() } } },
    } as unknown as typeof profile;
    await renderComponent({ inputs: { profile: testProfile } });
    await actor.click(screen.getByRole('button', { name: /toggle profile options/i }));
    await vi.waitFor(() =>
      expect(screen.getByRole('menu', { name: /profile options/i })).toBeVisible(),
    );
    expect(screen.getByRole('link', { name: /edit profile/i })).toBeVisible();
    expect(screen.getByRole('link', { name: /edit profile/i })).toHaveAttribute('href', '/edit');
    expect(screen.getByRole('link', { name: /upload picture/i })).toBeVisible();
    expect(screen.getByRole('link', { name: /upload picture/i })).toHaveAttribute('href', '/pic');
    expect(screen.getByRole('link', { name: /delete profile/i })).toBeVisible();
    expect(screen.getByRole('link', { name: /delete profile/i })).toHaveAttribute(
      'href',
      '/delete',
    );
    expect(screen.getByRole('link', { name: /delete picture/i })).toBeVisible();
    expect(screen.getByRole('link', { name: /delete picture/i })).toHaveAttribute(
      'href',
      `/pic/${testProfile.user.avatar!.image.id}/delete`,
    );
    await actor.click(screen.getByRole('button', { name: /toggle profile options/i }));
    await vi.waitFor(() =>
      expect(screen.queryByRole('menu', { name: /profile options/i })).toBeNull(),
    );
    expect(screen.queryByRole('link', { name: /edit profile/i })).toBeNull();
    expect(screen.queryByRole('link', { name: /upload picture/i })).toBeNull();
    expect(screen.queryByRole('link', { name: /delete profile/i })).toBeNull();
    expect(screen.queryByRole('link', { name: /delete picture/i })).toBeNull();
  });

  const followingTestData = [
    { action: 'follow' as const, followedByCurrentUser: false },
    { action: 'unfollow' as const, followedByCurrentUser: true },
  ];

  for (const { action, followedByCurrentUser } of followingTestData) {
    it(`should ${action}`, async () => {
      let sub!: Subscriber<unknown>;
      const actor = userEvent.setup();
      profilesMock.isCurrentProfile.mockImplementation(() => false);
      profilesMock.toggleFollowing.mockImplementation(() => new Observable((s) => (sub = s)));
      const testProfile = { ...profile, followedByCurrentUser };
      const { detectChanges } = await renderComponent({ inputs: { profile: testProfile } });
      const followBtn = screen.getByRole('button', { name: new RegExp(`^${action}`, 'i') });
      assertNavBtnsEnabled();
      await actor.click(followBtn);
      assertNavBtnsEnabled();
      expect(followBtn).toBeDisabled();
      sub.next('');
      sub.complete();
      detectChanges();
      assertNavigated();
      assertNavBtnsEnabled(followBtn);
      expect(profilesMock.toggleFollowing).toHaveBeenCalledExactlyOnceWith(testProfile);
    });

    it(`should fail to ${action}`, async () => {
      let sub!: Subscriber<unknown>;
      const actor = userEvent.setup();
      profilesMock.isCurrentProfile.mockImplementation(() => false);
      profilesMock.toggleFollowing.mockImplementation(() => new Observable((s) => (sub = s)));
      const testProfile = { ...profile, followedByCurrentUser };
      const { detectChanges } = await renderComponent({ inputs: { profile: testProfile } });
      const followBtn = screen.getByRole('button', { name: new RegExp(`^${action}`, 'i') });
      assertNavBtnsEnabled(followBtn);
      await actor.click(followBtn);
      assertNavBtnsEnabled();
      expect(followBtn).toBeDisabled();
      sub.error(new ProgressEvent('Network error'));
      detectChanges();
      assertNavBtnsEnabled(followBtn);
      expect(navigationSpy).toHaveBeenCalledTimes(0);
      expect(profilesMock.toggleFollowing).toHaveBeenCalledExactlyOnceWith(testProfile);
    });
  }

  const propertyTogglingTestData = [
    { property: 'active status' as const, data: { visible: !profile.visible } as const },
    { property: 'read receipt' as const, data: { tangible: !profile.tangible } as const },
  ];

  for (const { property, data } of propertyTogglingTestData) {
    it(`should toggle ${property}`, async () => {
      let sub!: Subscriber<unknown>;
      const actor = userEvent.setup();
      profilesMock.isCurrentProfile.mockImplementation(() => true);
      profilesMock.updateCurrentProfile.mockImplementation(() => new Observable((s) => (sub = s)));
      const { detectChanges } = await renderComponent();
      const propertySwitch = screen.getByRole('switch', { name: new RegExp(property, 'i') });
      assertNavBtnsEnabled(propertySwitch);
      await actor.click(propertySwitch);
      assertNavBtnsEnabled(propertySwitch);
      sub.next('');
      sub.complete();
      detectChanges();
      assertNavigated();
      assertNavBtnsEnabled(propertySwitch);
      expect(profilesMock.updateCurrentProfile).toHaveBeenCalledExactlyOnceWith(data);
    });

    it(`should fail to ${property}`, async () => {
      let sub!: Subscriber<unknown>;
      const actor = userEvent.setup();
      profilesMock.isCurrentProfile.mockImplementation(() => true);
      profilesMock.updateCurrentProfile.mockImplementation(() => new Observable((s) => (sub = s)));
      const { detectChanges } = await renderComponent();
      const propertySwitch = screen.getByRole('switch', { name: new RegExp(property, 'i') });
      assertNavBtnsEnabled(propertySwitch);
      await actor.click(propertySwitch);
      assertNavBtnsEnabled(propertySwitch);
      sub.error(new ProgressEvent('Network error'));
      detectChanges();
      assertNavBtnsEnabled(propertySwitch);
      expect(navigationSpy).toHaveBeenCalledTimes(0);
      expect(profilesMock.updateCurrentProfile).toHaveBeenCalledExactlyOnceWith(data);
    });
  }
});
