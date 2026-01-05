import { render, RenderComponentOptions, screen } from '@testing-library/angular';
import { userEvent } from '@testing-library/user-event';
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
    expect(screen.getByRole('menu', { name: /profile list/i })).toBeVisible();
    expect(screen.queryByRole('button', { name: /load more/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /retry/i })).toBeNull();
    expect(screen.queryByLabelText(/loading profiles/i)).toBeNull();
    expect(screen.queryByLabelText(/loading more/i)).toBeNull();
    for (const { id, user } of profiles) {
      const name = new RegExp(user.username);
      const profileLink = screen.getByRole('link', { name }) as HTMLAnchorElement;
      expect(profileLink.href).toMatch(new RegExp(`profiles/${id}$`));
    }
  });

  it('should display a profiles loading indicator', async () => {
    profilesMock.loading.mockImplementation(() => true);
    await renderComponent();
    expect(screen.getByLabelText(/loading profiles/i)).toBeVisible();
    expect(screen.queryByRole('button', { name: /retry/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /load more/i })).toBeNull();
    expect(screen.queryByLabelText(/loading more/i)).toBeNull();
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('should display an error message and a retry button that reload the profiles', async () => {
    const errMsg = 'Test error';
    profilesMock.loadError.mockImplementation(() => errMsg);
    const { click } = userEvent.setup();
    await renderComponent({ autoDetectChanges: false });
    profilesMock.load.mockClear();
    await click(screen.getByRole('button', { name: /retry/i }));
    expect(screen.getByText(errMsg)).toBeVisible();
    expect(profilesMock.load).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: /retry/i })).toBeVisible();
    expect(screen.queryByRole('button', { name: /load more/i })).toBeNull();
    expect(screen.queryByLabelText(/loading profiles/i)).toBeNull();
    expect(screen.queryByLabelText(/loading more/i)).toBeNull();
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('should invoke the load-more method automatically if can load more', async () => {
    profilesMock.list.mockImplementation(() => profiles);
    profilesMock.hasMore.mockImplementation(() => true);
    await renderComponent();
    expect(profilesMock.load).toHaveBeenCalled();
  });

  it('should display load-more button that invoke load-more method', async () => {
    profilesMock.list.mockImplementation(() => profiles);
    profilesMock.hasMore.mockImplementation(() => true);
    const { click } = userEvent.setup();
    await renderComponent({ autoDetectChanges: false });
    profilesMock.load.mockClear();
    const loadMoreBtn = screen.getByRole('button', { name: /load more/i });
    await click(loadMoreBtn);
    expect(loadMoreBtn).toBeVisible();
    expect(profilesMock.load).toHaveBeenCalledOnce();
    expect(screen.queryByLabelText(/loading more/i)).toBeNull();
    expect(screen.queryByLabelText(/loading profiles/i)).toBeNull();
  });

  it('should display load-more error and a retry-button that reloads more profiles', async () => {
    const errMsg = 'Test error';
    profilesMock.loadError.mockImplementation(() => errMsg);
    profilesMock.hasMore.mockImplementation(() => true);
    profilesMock.list.mockImplementation(() => profiles);
    const { click } = userEvent.setup();
    await renderComponent({ autoDetectChanges: false });
    profilesMock.load.mockClear();
    await click(screen.getByRole('button', { name: /retry/i }));
    expect(screen.getByText(errMsg)).toBeVisible();
    expect(profilesMock.load).toHaveBeenCalledOnce();
    expect(screen.queryByLabelText(/loading more/i)).toBeNull();
    expect(screen.queryByLabelText(/loading profiles/i)).toBeNull();
    expect(screen.queryByRole('button', { name: /load more/i })).toBeNull();
  });

  it('should display loading-more indicator', async () => {
    profilesMock.loading.mockImplementation(() => true);
    profilesMock.hasMore.mockImplementation(() => true);
    profilesMock.list.mockImplementation(() => profiles);
    await renderComponent();
    expect(screen.getByLabelText(/loading more/i)).toBeVisible();
    expect(screen.queryByLabelText(/loading profiles/i)).toBeNull();
    expect(screen.queryByRole('button', { name: /load more/i })).toBeNull();
  });
});
