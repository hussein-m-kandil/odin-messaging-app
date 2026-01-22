import { render, RenderComponentOptions, screen } from '@testing-library/angular';
import { Profile } from '../app.types';
import { Avatar } from './avatar';

const updatedAt = new Date(Date.now() + 777).toISOString();
const user = {
  username: 'test_username',
  avatar: { image: { src: 'img.png', alt: 'user_image', updatedAt } },
} as Profile['user'];

const mockUser = vi.fn(() => user);

const renderComponent = ({ inputs, ...options }: RenderComponentOptions<Avatar> = {}) => {
  return render(Avatar, {
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
});
