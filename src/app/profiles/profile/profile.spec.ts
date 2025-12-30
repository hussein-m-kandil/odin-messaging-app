import { render, RenderComponentOptions, screen } from '@testing-library/angular';
import { Profile as ProfileT } from '../../app.types';
import { Profile } from './profile';

const profile = {
  id: crypto.randomUUID(),
  user: { username: 'test_user', fullname: 'Test User' },
} as ProfileT;

const renderComponent = (options: RenderComponentOptions<Profile> = {}) => {
  return render(Profile, options);
};

describe('Profile', () => {
  afterEach(vi.resetAllMocks);

  it('should render the given profile data', async () => {
    await renderComponent({ inputs: { profile } });
    expect(screen.getByRole('heading', { name: new RegExp(profile.user.fullname) })).toBeVisible();
    expect(screen.getByText(profile.user.username[0].toUpperCase())).toBeVisible();
    expect(screen.getByText(new RegExp(profile.user.username))).toBeVisible();
    expect(
      screen.getByRole('link', { name: new RegExp(`chat with ${profile.user.username}`, 'i') })
    ).toBeVisible();
    expect(screen.queryByRole('button', { name: /retry/i })).toBeNull();
    expect(screen.queryByLabelText(/loading profile/i)).toBeNull();
    expect(screen.queryByText(/failed/i)).toBeNull();
  });
});
