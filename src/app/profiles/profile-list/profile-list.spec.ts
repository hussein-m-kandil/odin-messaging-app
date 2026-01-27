import { render, RenderComponentOptions, screen } from '@testing-library/angular';
import { userEvent } from '@testing-library/user-event';
import { ProfileList } from './profile-list';
import { Router } from '@angular/router';
import { Profiles } from '../profiles';
import { User } from '../../app.types';

const navigationSpy = vi.spyOn(Router.prototype, 'navigate');

const profilesMock = {
  load: vi.fn(),
  reset: vi.fn(),
  loadError: vi.fn(() => ''),
  loading: vi.fn(() => false),
  hasMore: vi.fn(() => false),
  list: vi.fn<() => unknown[]>(() => []),
  searchValue: { set: vi.fn() },
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

  it('should set the search value if present and load if the profile list is empty', async () => {
    profilesMock.list.mockImplementation(() => []);
    const searchValues = ['foo', 'bar', 'tar'];
    const { rerender } = await renderComponent();
    await rerender({ partialUpdate: true });
    await rerender({ partialUpdate: true });
    expect(profilesMock.load).toHaveBeenCalledTimes(3);
    profilesMock.load.mockClear();
    for (let i = 0; i < searchValues.length; i++) {
      const name = searchValues[i];
      await rerender({ inputs: { name }, partialUpdate: true });
      expect(profilesMock.searchValue.set).toHaveBeenNthCalledWith(i + 1, name);
    }
    expect(profilesMock.searchValue.set).toHaveBeenCalledTimes(searchValues.length);
    expect(profilesMock.load).toHaveBeenCalledTimes(searchValues.length);
  });

  it('should set the search value if present and not load, if the profile list is not empty', async () => {
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
    expect(profilesMock.load).toHaveBeenCalledTimes(0);
  });

  it('should display a list of named profiles', async () => {
    profilesMock.list.mockImplementation(() => profiles);
    await renderComponent();
    expect(screen.getAllByRole('listitem')).toHaveLength(profiles.length);
    for (const { id, user } of profiles) {
      const name = new RegExp(user.username);
      const profileLink = screen.getByRole('link', { name }) as HTMLAnchorElement;
      expect(profileLink.href).toMatch(new RegExp(`profiles/${id}$`));
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
    expect(profilesMock.reset).toHaveBeenCalledTimes(searchValue.length);
    expect(navigationSpy).toHaveBeenCalledTimes(searchValue.length);
    for (let i = 0; i < searchValue.length; i++) {
      const n = i + 1;
      const currentValue = searchValue.slice(0, n);
      expect(profilesMock.reset).toHaveBeenNthCalledWith(n);
      expect(navigationSpy.mock.calls[i][0]).toStrictEqual(['.']);
      expect(navigationSpy.mock.calls[i][1]).toHaveProperty('queryParams', { name: currentValue });
    }
  });
});
