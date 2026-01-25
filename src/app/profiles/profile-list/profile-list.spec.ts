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

  it('should reset, set search value and load the profiles on every render', async () => {
    const searchValues = ['foo', 'bar', 'tar'];
    const { rerender } = await renderComponent();
    vi.clearAllMocks();
    for (let i = 0; i < searchValues.length; i++) {
      const name = searchValues[i];
      await rerender({ inputs: { name }, partialUpdate: true });
      expect(profilesMock.searchValue.set).toHaveBeenNthCalledWith(i + 1, name);
    }
    expect(profilesMock.searchValue.set).toHaveBeenCalledTimes(searchValues.length);
    expect(profilesMock.reset).toHaveBeenCalledTimes(searchValues.length);
    expect(profilesMock.load).toHaveBeenCalledTimes(searchValues.length);
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

  it('should keep query parameters in sync with the current search value', async () => {
    const actor = userEvent.setup();
    const name = 'test name';
    await renderComponent();
    await actor.type(screen.getByRole('textbox', { name: /search/i }), name);
    expect(navigationSpy).toHaveBeenCalledTimes(name.length);
    for (let i = 0; i < name.length; i++) {
      const n = i + 1;
      const value = name.slice(0, n);
      expect(navigationSpy.mock.calls[i][0]).toStrictEqual(['.']);
      expect(navigationSpy.mock.calls[i][1]).toHaveProperty('queryParams', { name: value });
    }
  });
});
