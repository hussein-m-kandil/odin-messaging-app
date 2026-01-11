import { render, RenderComponentOptions, screen } from '@testing-library/angular';
import { Profile as ProfileT, User } from '../../app.types';
import { Profile } from './profile';
import { Profiles } from '../profiles';

const user = {
  id: crypto.randomUUID(),
  username: 'test_user',
  fullname: 'Test User',
  bio: 'Test bio.',
} as User;
const profile = { id: crypto.randomUUID(), user } as unknown as ProfileT;
user.profile = profile;

const profilesMock = { list: vi.fn(() => [] as ProfileT[]), isCurrentProfile: vi.fn(() => false) };

const renderComponent = ({ providers, ...options }: RenderComponentOptions<Profile> = {}) => {
  return render(Profile, {
    providers: [{ provide: Profiles, useValue: profilesMock }, ...(providers || [])],
    inputs: { profile },
    ...options,
  });
};

describe('Profile', () => {
  afterEach(vi.resetAllMocks);

  it('should render the non-current profile data', async () => {
    profilesMock.isCurrentProfile.mockImplementation(() => false);
    await renderComponent();
    expect(screen.getByRole('heading', { name: new RegExp(profile.user.fullname) })).toBeVisible();
    expect(screen.getByText(profile.user.username[0].toUpperCase())).toBeVisible();
    expect(screen.getByText(new RegExp(profile.user.username))).toBeVisible();
    expect(screen.getByText(new RegExp(profile.user.bio))).toBeVisible();
    expect(screen.getByRole('link', { name: /back/i })).toBeVisible();
    expect(screen.queryByRole('link', { name: /edit profile/i })).toBeNull();
    expect(
      screen.getByRole('link', { name: new RegExp(`chat with ${profile.user.username}`, 'i') })
    ).toBeVisible();
  });

  it('should render the current profile data', async () => {
    profilesMock.isCurrentProfile.mockImplementation(() => true);
    await renderComponent();
    expect(screen.getByRole('heading', { name: new RegExp(profile.user.fullname) })).toBeVisible();
    expect(screen.getByText(profile.user.username[0].toUpperCase())).toBeVisible();
    expect(screen.getByText(new RegExp(profile.user.username))).toBeVisible();
    expect(screen.getByText(new RegExp(profile.user.bio))).toBeVisible();
    expect(screen.getByRole('link', { name: /back/i })).toBeVisible();
    expect(screen.getByRole('link', { name: /edit profile/i })).toBeVisible();
    expect(screen.getByRole('link', { name: /chat with yourself/i })).toBeVisible();
  });
});
