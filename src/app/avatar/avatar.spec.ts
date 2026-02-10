import { render, RenderComponentOptions, screen } from '@testing-library/angular';
import { ProfileBase, User } from '../app.types';
import { Profiles } from '../profiles';
import { Avatar } from './avatar';
import { Auth } from '../auth';
import { of } from 'rxjs';

const updatedAt = new Date(Date.now() + 777).toISOString();
const user = {
  username: 'test_username',
  avatar: { image: { src: 'img.png', alt: 'user_image', updatedAt } },
} as User;

const profile: ProfileBase = {
  lastSeen: new Date().toDateString(),
  followedByCurrentUser: true,
  id: crypto.randomUUID(),
  tangible: true,
  visible: true,
};

const mockUser = vi.fn(() => user);

const authMock = { socket: { on: vi.fn(), removeListener: vi.fn() } };
const profilesMock = { isCurrentProfile: vi.fn(() => false), isOnline: vi.fn(() => of(true)) };

const renderComponent = ({
  providers,
  inputs,
  ...options
}: RenderComponentOptions<Avatar> = {}) => {
  return render(Avatar, {
    providers: [
      { provide: Profiles, useValue: profilesMock },
      { provide: Auth, useValue: authMock },
      ...(providers || []),
    ],
    inputs: { user: mockUser(), ...inputs },
    autoDetectChanges: false,
    ...options,
  });
};

describe('Avatar', () => {
  afterEach(vi.resetAllMocks);

  it('should display the user image', async () => {
    const src = `${location.href}${user.avatar!.image.src}?updatedAt=${updatedAt}`;
    await renderComponent();
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', src);
    expect(img).toHaveProperty('tagName', 'IMG');
    expect(img).toHaveAttribute('alt', user.username);
    expect(img).not.toHaveAttribute('aria-label', user.username);
    expect(screen.queryByText(new RegExp(user.username[0]))).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('should have a preview button', async () => {
    await renderComponent({ inputs: { preview: '' } });
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('should not have a preview button', async () => {
    await renderComponent({ inputs: { preview: false } });
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('should append the image updatedAt to the list of url search params', async () => {
    const src = `${location.href}${user.avatar!.image.src}?foo=bar&tar=baz`;
    mockUser.mockImplementation(() => ({
      ...user,
      avatar: { ...user.avatar, image: { ...user.avatar!.image, src } },
    }));
    await renderComponent();
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', `${src}&updatedAt=${updatedAt}`);
  });

  it('should append the image updateAt search param without duplicating the trailing &', async () => {
    const src = `${location.href}${user.avatar!.image.src}?foo=bar&tar=baz`;
    mockUser.mockImplementation(() => ({
      ...user,
      avatar: { ...user.avatar, image: { ...user.avatar!.image, src: `${src}&` } },
    }));
    await renderComponent();
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', `${src}&updatedAt=${updatedAt}`);
  });

  it('should display the first letter of the username', async () => {
    mockUser.mockImplementation(() => ({ ...user, avatar: null }));
    await renderComponent();
    const img = screen.getByRole('img');
    expect(img).toBeVisible();
    expect(img).not.toHaveAttribute('alt', user.username);
    expect(img).toHaveAttribute('aria-label', user.username);
    expect(img).toHaveTextContent(user.username[0].toUpperCase());
  });

  it('should display an icon if not got a username nor an image', async () => {
    mockUser.mockImplementation(() => ({ ...user, username: '', avatar: null }));
    await renderComponent();
    const img = screen.getByRole('img');
    expect(img).toBeVisible();
    expect(img).not.toHaveAttribute('alt', user.username);
    expect(img).not.toHaveTextContent(user.username[0].toUpperCase());
    expect(img).toHaveAttribute('aria-label', 'Anonymous user');
    expect(img.querySelector('.pi-user')).toBeVisible();
  });

  it('should display the avatar in size corresponding to the given value', async () => {
    const { rerender, container } = await renderComponent();
    const sizeValues = ['xs', 'sm', 'md', 'lg', 'xl'];
    const sizes: number[] = [];
    for (const size of sizeValues) {
      await rerender({ inputs: { size }, partialUpdate: true });
      const prevSize = sizes.at(-1);
      const currSize = Number(
        container
          .querySelector('span')!
          .className.split(' ')
          .find((cn) => /^size-\d+$/.test(cn))!
          .replace(/[^\d]/g, ''),
      );
      if (prevSize) {
        expect(currSize).toBeGreaterThan(prevSize);
      }
      sizes.push(currSize);
    }
    expect(sizes).toHaveLength(sizeValues.length);
  });

  it('should not display online status for the current profile', async () => {
    profilesMock.isCurrentProfile.mockImplementation(() => true);
    profilesMock.isOnline.mockImplementation(() => of(true));
    await renderComponent();
    expect(screen.queryByLabelText(/online/i)).toBeNull();
  });

  it('should not display online status if not online', async () => {
    profilesMock.isCurrentProfile.mockImplementation(() => false);
    profilesMock.isOnline.mockImplementation(() => of(false));
    await renderComponent();
    expect(screen.queryByLabelText(/online/i)).toBeNull();
  });

  it('should not display online status if not given a profile', async () => {
    profilesMock.isCurrentProfile.mockImplementation(() => false);
    profilesMock.isOnline.mockImplementation(() => of(true));
    await renderComponent({ inputs: { profile: undefined } });
    expect(screen.queryByLabelText(/online/i)).toBeNull();
  });

  it('should not display online status if given `null` as the profile', async () => {
    profilesMock.isCurrentProfile.mockImplementation(() => false);
    profilesMock.isOnline.mockImplementation(() => of(true));
    await renderComponent({ inputs: { profile: null } });
    expect(screen.queryByLabelText(/online/i)).toBeNull();
  });

  it('should not display online status if the profile is invisible', async () => {
    profilesMock.isCurrentProfile.mockImplementation(() => false);
    profilesMock.isOnline.mockImplementation(() => of(true));
    await renderComponent({ inputs: { profile: { ...profile, visible: false } } });
    expect(screen.queryByLabelText(/online/i)).toBeNull();
  });

  it('should display online status', async () => {
    profilesMock.isCurrentProfile.mockImplementation(() => false);
    profilesMock.isOnline.mockImplementation(() => of(true));
    await renderComponent({ inputs: { profile } });
    expect(screen.getByLabelText(/online/i)).toBeVisible();
  });

  it('should display online status after `online` event emitted from the socket', async () => {
    let callback!: () => void;
    authMock.socket.on.mockImplementation((event: string, cb: () => void) => {
      if (event === `online:${profile.id}`) callback = cb;
    });
    profilesMock.isCurrentProfile.mockImplementation(() => false);
    profilesMock.isOnline.mockImplementation(() => of(false));
    const { detectChanges } = await renderComponent({ inputs: { profile } });
    callback();
    detectChanges();
    expect(screen.getByLabelText(/online/i)).toBeVisible();
  });

  it('should not display online status after `offline` event emitted from the socket', async () => {
    let callback!: () => void;
    authMock.socket.on.mockImplementation((event: string, cb: () => void) => {
      if (event === `offline:${profile.id}`) callback = cb;
    });
    profilesMock.isCurrentProfile.mockImplementation(() => false);
    profilesMock.isOnline.mockImplementation(() => of(true));
    const { detectChanges } = await renderComponent({ inputs: { profile } });
    expect(authMock.socket.removeListener).toHaveBeenCalledTimes(2);
    expect(authMock.socket.on).toHaveBeenCalledTimes(2);
    authMock.socket.removeListener.mockClear();
    authMock.socket.on.mockClear();
    callback();
    detectChanges();
    expect(screen.queryByLabelText(/online/i)).toBeNull();
    expect(authMock.socket.on).toHaveBeenCalledTimes(0);
    expect(authMock.socket.removeListener).toHaveBeenCalledTimes(0);
  });

  it('should remove online-status listeners on profile-change', async () => {
    profilesMock.isOnline.mockImplementation(() => of(true));
    profilesMock.isCurrentProfile.mockImplementation(() => false);
    const { rerender } = await renderComponent({ inputs: { profile } });
    expect(authMock.socket.removeListener).toHaveBeenCalledTimes(2);
    expect(screen.getByLabelText(/online/i)).toBeVisible();
    expect(authMock.socket.on).toHaveBeenCalledTimes(2);
    authMock.socket.on.mockClear();
    authMock.socket.removeListener.mockClear();
    profilesMock.isOnline.mockImplementation(() => of(false));
    await rerender({
      inputs: { profile: { ...profile, id: crypto.randomUUID() } },
      partialUpdate: true,
    });
    expect(authMock.socket.on).toHaveBeenCalledTimes(2);
    expect(screen.queryByLabelText(/online/i)).toBeNull();
    expect(authMock.socket.removeListener).toHaveBeenCalledTimes(2);
  });
});
