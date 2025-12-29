import { render, RenderComponentOptions, screen } from '@testing-library/angular';
import { userEvent } from '@testing-library/user-event';
import { ProfileList } from './profile-list';
import { Profiles } from '../profiles';

const profilesMock = {
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
    providers: [{ provide: Profiles, useValue: profilesMock }, ...(providers || [])],
    ...options,
  });
};

describe('ProfileList', () => {
  afterEach(vi.resetAllMocks);

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
    profilesMock.canLoadMore.mockImplementation(() => true);
    await renderComponent();
    expect(profilesMock.loadMore).toHaveBeenCalled();
  });

  it('should display load-more button that invoke load-more method', async () => {
    profilesMock.list.mockImplementation(() => profiles);
    profilesMock.canLoadMore.mockImplementation(() => true);
    const { click } = userEvent.setup();
    await renderComponent({ autoDetectChanges: false });
    profilesMock.loadMore.mockClear();
    const loadMoreBtn = screen.getByRole('button', { name: /load more/i });
    await click(loadMoreBtn);
    expect(loadMoreBtn).toBeVisible();
    expect(profilesMock.loadMore).toHaveBeenCalledOnce();
    expect(screen.queryByLabelText(/loading more/i)).toBeNull();
    expect(screen.queryByLabelText(/loading profiles/i)).toBeNull();
  });

  it('should display load-more error and a retry-button that reloads more profiles', async () => {
    const errMsg = 'Test error';
    profilesMock.loadMoreError.mockImplementation(() => errMsg);
    profilesMock.canLoadMore.mockImplementation(() => true);
    profilesMock.list.mockImplementation(() => profiles);
    const { click } = userEvent.setup();
    await renderComponent({ autoDetectChanges: false });
    await click(screen.getByRole('button', { name: /retry/i }));
    expect(screen.getByText(errMsg)).toBeVisible();
    expect(profilesMock.loadMore).toHaveBeenCalledOnce();
    expect(screen.queryByLabelText(/loading more/i)).toBeNull();
    expect(screen.queryByLabelText(/loading profiles/i)).toBeNull();
    expect(screen.queryByRole('button', { name: /load more/i })).toBeNull();
  });

  it('should display loading-more indicator', async () => {
    profilesMock.loadingMore.mockImplementation(() => true);
    profilesMock.canLoadMore.mockImplementation(() => true);
    profilesMock.list.mockImplementation(() => profiles);
    await renderComponent();
    expect(screen.getByLabelText(/loading more/i)).toBeVisible();
    expect(screen.queryByLabelText(/loading profiles/i)).toBeNull();
    expect(screen.queryByRole('button', { name: /load more/i })).toBeNull();
  });
});
