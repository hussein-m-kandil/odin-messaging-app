import { provideRouter, Router, withComponentInputBinding } from '@angular/router';
import { render, RenderComponentOptions, screen } from '@testing-library/angular';
import { userEvent } from '@testing-library/user-event';
import { ProfileList } from './profile-list';
import { Profiles } from '../profiles';
import { User } from '../../app.types';

const navigationSpy = vi.spyOn(Router.prototype, 'navigate');

const profilesMock = {
  load: vi.fn(),
  reset: vi.fn(),
  loadError: vi.fn(() => ''),
  loading: vi.fn(() => false),
  hasMore: vi.fn(() => false),
  isCurrentProfile: vi.fn(() => false),
  list: vi.fn<() => unknown[]>(() => []),
  searchValue: { set: vi.fn() },
  path: { set: vi.fn() },
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
    autoDetectChanges: false,
    ...options,
  });
};

describe('ProfileList', () => {
  afterEach(vi.resetAllMocks);

  const paths = ['', 'following', 'followers'];
  for (const path of paths) {
    it(`should set the path to "${path || 'profiles'}"`, async () => {
      profilesMock.list.mockImplementation(() => []);
      const routes = [{ path: '**', component: ProfileList, resolve: { user: () => user } }];
      await renderComponent({
        initialRoute: `/${path || 'profiles'}?key=value`,
        providers: [provideRouter(routes, withComponentInputBinding())],
      });
      expect(profilesMock.path.set).toHaveBeenCalledTimes(1);
      expect(profilesMock.path.set).toHaveBeenNthCalledWith(1, path);
      expect(profilesMock.searchValue.set).toHaveBeenCalledTimes(0);
      expect(profilesMock.load).toHaveBeenCalledTimes(1);
    });
  }

  it('should reset profiles, set the path, the search value if present, and load if the profile list is empty', async () => {
    profilesMock.list.mockImplementation(() => []);
    const searchValues = ['foo', 'bar', 'tar'];
    const { rerender } = await renderComponent();
    await rerender({ partialUpdate: true });
    await rerender({ partialUpdate: true });
    expect(profilesMock.path.set).toHaveBeenCalledTimes(3);
    expect(profilesMock.reset).toHaveBeenCalledTimes(3);
    expect(profilesMock.load).toHaveBeenCalledTimes(3);
    for (let i = 0; i < 3; i++) {
      const n = i + 1;
      expect(profilesMock.load).toHaveBeenNthCalledWith(n);
      expect(profilesMock.path.set).toHaveBeenNthCalledWith(n, '');
    }
    profilesMock.load.mockClear();
    profilesMock.reset.mockClear();
    profilesMock.path.set.mockClear();
    for (let i = 0; i < searchValues.length; i++) {
      const name = searchValues[i];
      await rerender({ inputs: { name }, partialUpdate: true });
      expect(profilesMock.searchValue.set).toHaveBeenNthCalledWith(i + 1, name);
    }
    expect(profilesMock.searchValue.set).toHaveBeenCalledTimes(searchValues.length);
    expect(profilesMock.path.set).toHaveBeenCalledTimes(searchValues.length);
    expect(profilesMock.reset).toHaveBeenCalledTimes(searchValues.length);
    expect(profilesMock.load).toHaveBeenCalledTimes(searchValues.length);
  });

  it('should reset profiles, set the search value if present, but not load, if the profile list is not empty', async () => {
    profilesMock.list.mockImplementation(() => profiles);
    const searchValues = ['foo', 'bar', 'tar'];
    const { rerender } = await renderComponent();
    await rerender({ partialUpdate: true });
    await rerender({ partialUpdate: true });
    for (let i = 0; i < searchValues.length; i++) {
      const name = searchValues[i];
      await rerender({ inputs: { name }, partialUpdate: true });
      expect(profilesMock.searchValue.set).toHaveBeenNthCalledWith(i + 1, name);
    }
    expect(profilesMock.searchValue.set).toHaveBeenCalledTimes(searchValues.length);
    expect(profilesMock.reset).toHaveBeenCalledTimes(searchValues.length + 3);
    expect(profilesMock.load).toHaveBeenCalledTimes(0);
  });

  it('should reset profiles, but not load, if profiles is loading', async () => {
    profilesMock.list.mockImplementation(() => profiles);
    profilesMock.loading.mockImplementation(() => true);
    const { rerender } = await renderComponent();
    await rerender({ partialUpdate: true });
    await rerender({ partialUpdate: true });
    expect(profilesMock.reset).toHaveBeenCalledTimes(3);
    expect(profilesMock.load).toHaveBeenCalledTimes(0);
  });

  it('should display a list of named profiles', async () => {
    profilesMock.list.mockImplementation(() => profiles);
    await renderComponent();
    expect(screen.getAllByRole('listitem')).toHaveLength(profiles.length);
    for (const { user } of profiles) {
      const name = new RegExp(user.username);
      const profileLink = screen.getByRole('link', { name }) as HTMLAnchorElement;
      expect(profileLink.href).toMatch(new RegExp(`profiles/${user.username}$`));
    }
  });

  it('should render a search box', async () => {
    await renderComponent();
    expect(screen.getByRole('textbox', { name: /search/i })).toBeVisible();
  });

  it('should reset the profiles on search, and keep query parameters in sync with the search value', async () => {
    const actor = userEvent.setup();
    const searchValue = 'test name';
    await renderComponent();
    await actor.type(screen.getByRole('textbox', { name: /search/i }), searchValue);
    expect(navigationSpy).toHaveBeenCalledTimes(searchValue.length);
    expect(profilesMock.reset).toHaveBeenCalledTimes(1);
    for (let i = 0; i < searchValue.length; i++) {
      const n = i + 1;
      const currentValue = searchValue.slice(0, n);
      expect(navigationSpy.mock.calls[i][0]).toStrictEqual(['.']);
      expect(navigationSpy.mock.calls[i][1]).toHaveProperty('queryParams', { name: currentValue });
    }
  });
});
