import { render, RenderComponentOptions, screen } from '@testing-library/angular';
import { userEvent } from '@testing-library/user-event';
import { ProfileList } from './profile-list';
import { Profiles } from '../profiles';

const ProfilesMock = {
  load: vi.fn<() => void>(),
  loadError: vi.fn(() => ''),
  loading: vi.fn(() => false),
  loadMore: vi.fn<() => void>(),
  loadMoreError: vi.fn(() => ''),
  moreLoaded: vi.fn(() => false),
  loadingMore: vi.fn(() => false),
  canLoadMore: vi.fn(() => false),
  hasAnyLoadError: vi.fn(() => false),
  list: vi.fn<() => unknown[]>(() => []),
};

const profiles = [
  { id: crypto.randomUUID(), user: { username: 'test_user_01' } },
  { id: crypto.randomUUID(), user: { username: 'test_user_02' } },
];

const renderComponent = ({ providers, ...options }: RenderComponentOptions<ProfileList> = {}) => {
  return render(ProfileList, {
    providers: [{ provide: Profiles, useValue: ProfilesMock }, ...(providers || [])],
    ...options,
  });
};

describe('ProfileList', () => {
  afterEach(vi.resetAllMocks);

  it('should display a list of named profiles', async () => {
    ProfilesMock.list.mockImplementation(() => profiles);
    await renderComponent();
    expect(screen.getAllByRole('listitem')).toHaveLength(profiles.length);
    expect(screen.getByRole('list', { name: /profile list/i })).toBeVisible();
    expect(screen.queryByRole('button', { name: /load more/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /retry/i })).toBeNull();
    expect(screen.queryByText(/loading profiles/i)).toBeNull();
    expect(screen.queryByText(/loading more/i)).toBeNull();
    for (const { id, user } of profiles) {
      const name = new RegExp(user.username);
      const profileLink = screen.getByRole('link', { name }) as HTMLAnchorElement;
      expect(profileLink.href).toMatch(new RegExp(`profiles/${id}$`));
    }
  });

  it('should display a profiles loading indicator', async () => {
    ProfilesMock.loading.mockImplementation(() => true);
    await renderComponent();
    expect(screen.getByText(/loading profiles/i)).toBeVisible();
    expect(screen.queryByRole('button', { name: /retry/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /load more/i })).toBeNull();
    expect(screen.queryByText(/loading more/i)).toBeNull();
    expect(screen.queryByRole('list')).toBeNull();
  });

  it('should display an error message and a retry button', async () => {
    const errMsg = 'Test error';
    ProfilesMock.loadError.mockImplementation(() => errMsg);
    await renderComponent();
    expect(screen.getByText(errMsg)).toBeVisible();
    expect(screen.getByRole('button', { name: /retry/i })).toBeVisible();
    expect(screen.queryByRole('button', { name: /load more/i })).toBeNull();
    expect(screen.queryByText(/loading profiles/i)).toBeNull();
    expect(screen.queryByText(/loading more/i)).toBeNull();
    expect(screen.queryByRole('list')).toBeNull();
  });

  it('should load again on clicking the retry button', async () => {
    ProfilesMock.loadError.mockImplementation(() => 'Test error');
    const { click } = userEvent.setup();
    await renderComponent();
    ProfilesMock.load.mockClear();
    await click(screen.getByRole('button', { name: /retry/i }));
    expect(ProfilesMock.load).toHaveBeenCalledOnce();
  });

  it('should invoke the load-more method automatically if can load more', async () => {
    ProfilesMock.list.mockImplementation(() => profiles);
    ProfilesMock.canLoadMore.mockImplementation(() => true);
    await renderComponent();
    expect(ProfilesMock.loadMore).toHaveBeenCalled();
  });

  it('should display load-more button that invoke load-more method', async () => {
    ProfilesMock.list.mockImplementation(() => profiles);
    ProfilesMock.canLoadMore.mockImplementation(() => true);
    const { click } = userEvent.setup();
    await renderComponent();
    ProfilesMock.loadMore.mockClear();
    const loadMoreBtn = screen.getByRole('button', { name: /load more/i });
    await click(loadMoreBtn);
    expect(loadMoreBtn).toBeVisible();
    expect(ProfilesMock.loadMore).toHaveBeenCalledOnce();
    expect(screen.queryByText(/loading more/i)).toBeNull();
    expect(screen.queryByText(/loading profiles/i)).toBeNull();
  });

  it('should display load-more error', async () => {
    const errMsg = 'Test error';
    ProfilesMock.loadMoreError.mockImplementation(() => errMsg);
    ProfilesMock.canLoadMore.mockImplementation(() => true);
    ProfilesMock.list.mockImplementation(() => profiles);
    await renderComponent();
    expect(screen.getByText(errMsg)).toBeVisible();
    expect(screen.queryByText(/loading more/i)).toBeNull();
    expect(screen.queryByText(/loading profiles/i)).toBeNull();
    expect(screen.queryByRole('button', { name: /load more/i })).toBeNull();
  });

  it('should display loading-more indicator', async () => {
    ProfilesMock.loadingMore.mockImplementation(() => true);
    ProfilesMock.canLoadMore.mockImplementation(() => true);
    ProfilesMock.list.mockImplementation(() => profiles);
    await renderComponent();
    expect(screen.getByText(/loading more/i)).toBeVisible();
    expect(screen.queryByText(/loading profiles/i)).toBeNull();
    expect(screen.queryByRole('button', { name: /load more/i })).toBeNull();
  });
});
