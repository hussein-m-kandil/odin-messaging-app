import { render, RenderComponentOptions, screen } from '@testing-library/angular';
import { ProfileList } from './profile-list';
import { Profiles } from '../profiles';
import { User } from '../../app.types';

const profilesMock = {
  load: vi.fn(),
  reset: vi.fn(),
  loadError: vi.fn(() => ''),
  loading: vi.fn(() => false),
  hasMore: vi.fn(() => false),
  list: vi.fn<() => unknown[]>(() => []),
};

const profiles = [
  { id: crypto.randomUUID(), user: { username: 'test_user_01' } },
  { id: crypto.randomUUID(), user: { username: 'test_user_02' } },
];

const user = { id: crypto.randomUUID() } as User;

const renderComponent = ({
  providers,
  inputs,
  ...options
}: RenderComponentOptions<ProfileList> = {}) => {
  return render(ProfileList, {
    providers: [{ provide: Profiles, useValue: profilesMock }, ...(providers || [])],
    inputs: { user, ...inputs },
    ...options,
  });
};

describe('ProfileList', () => {
  afterEach(vi.resetAllMocks);

  it('should reset and load the profiles on every render', async () => {
    const { rerender } = await renderComponent();
    await rerender();
    await rerender();
    expect(profilesMock.load).toHaveBeenCalledTimes(3);
    expect(profilesMock.reset).toHaveBeenCalledTimes(3);
  });

  it('should display a list of named profiles', async () => {
    profilesMock.list.mockImplementation(() => profiles);
    await renderComponent();
    expect(screen.getAllByRole('menuitem')).toHaveLength(profiles.length);
    for (const { id, user } of profiles) {
      const name = new RegExp(user.username);
      const profileLink = screen.getByRole('link', { name }) as HTMLAnchorElement;
      expect(profileLink.href).toMatch(new RegExp(`profiles/${id}$`));
    }
  });
});
