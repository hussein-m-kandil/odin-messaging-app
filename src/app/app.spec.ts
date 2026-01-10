import { render, screen, fireEvent, RenderComponentOptions } from '@testing-library/angular';
import { userEvent } from '@testing-library/user-event';
import { SingularView } from './mainbar/singular-view';
import { Navigation } from './navigation';
import { Component } from '@angular/core';
import { Auth } from './auth';
import { App } from './app';
import { of } from 'rxjs';

const user = {
  profile: { id: crypto.randomUUID() },
  id: crypto.randomUUID(),
  username: 'test_user',
  fullname: 'Test User',
  bio: 'Test bio.',
};

const singularViewMock = {
  enabled: vi.fn(() => false),
  disabled: vi.fn(() => true),
  disable: vi.fn(),
  enable: vi.fn(),
  toggle: vi.fn(),
};

const navigationMock = { isInitial: vi.fn(), navigating: vi.fn(), error: vi.fn() };

const authMock = { user: vi.fn(() => user) };

const resolve = { testData: vi.fn(() => of(null)) };

@Component({ selector: 'app-chat-list', template: `<div>{{ title }}</div>` })
class ChatListMock {
  static TITLE = 'Test Chat List';
  protected title = ChatListMock.TITLE;
}
@Component({ selector: 'app-profile-list', template: `<div>{{ title }}</div>` })
class ProfileListMock {
  static TITLE = 'Test Profile List';
  protected title = ProfileListMock.TITLE;
}
@Component({ selector: 'app-chat-room', template: `<div>{{ title }}</div>` })
class ChatRoomMock {
  static TITLE = 'Test Chat Room';
  protected title = ChatRoomMock.TITLE;
}

const testRoutes = [
  {
    path: '',
    resolve,
    children: [
      {
        path: 'chats',
        children: [
          { path: '', outlet: 'mainMenu', component: ChatListMock },
          { path: ':chatId', component: ChatRoomMock },
        ],
      },
      {
        path: 'profiles',
        children: [
          { path: '', outlet: 'mainMenu', component: ProfileListMock },
          { path: ':profileId', component: ChatRoomMock },
        ],
      },
    ],
  },
];

const renderComponent = ({
  initialRoute,
  providers,
  routes,
  ...options
}: RenderComponentOptions<App> = {}) => {
  return render(App, {
    providers: [
      { provide: SingularView, useValue: singularViewMock },
      { provide: Navigation, useValue: navigationMock },
      { provide: Auth, useValue: authMock },
      ...(providers || []),
    ],
    initialRoute: initialRoute || '/chats',
    routes: routes || testRoutes,
    ...options,
  });
};

describe('App', () => {
  afterEach(vi.resetAllMocks);

  it('should display the chat list', async () => {
    await renderComponent();
    expect(screen.getByText(ChatListMock.TITLE)).toBeVisible();
    expect(screen.getByRole('link', { name: /profiles/i })).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('link', { name: /chats/i })).toHaveAttribute('aria-current', 'page');
  });

  it('should display the profile list', async () => {
    await renderComponent({ initialRoute: '/profiles' });
    expect(screen.getByText(ProfileListMock.TITLE)).toBeVisible();
    expect(screen.getByRole('link', { name: /chats/i })).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('link', { name: /profiles/i })).toHaveAttribute('aria-current', 'page');
  });

  it('should show loader on initial navigation', async () => {
    navigationMock.navigating.mockImplementation(() => true);
    navigationMock.isInitial.mockImplementation(() => true);
    await renderComponent();
    expect(screen.getByLabelText(/loading/i)).toBeVisible();
    expect(screen.queryByText(ChatRoomMock.TITLE)).toBeNull();
    expect(screen.queryByText(ChatListMock.TITLE)).toBeNull();
  });

  it('should show loader on non-initial navigation', async () => {
    navigationMock.navigating.mockImplementation(() => true);
    navigationMock.isInitial.mockImplementation(() => false);
    await renderComponent();
    expect(screen.getByLabelText(/loading/i)).toBeVisible();
    expect(screen.queryByText(ChatRoomMock.TITLE)).toBeNull();
    expect(screen.getByText(ChatListMock.TITLE)).toBeVisible();
  });

  it('should display an initial navigation error message and a retry button', async () => {
    const error = { message: 'Test navigation error', url: '/' };
    navigationMock.isInitial.mockImplementation(() => true);
    navigationMock.error.mockImplementation(() => error);
    await renderComponent();
    expect(screen.getByText(error.message));
    expect(screen.getByRole('button', { name: /retry/i }));
    expect(screen.queryByText(ChatListMock.TITLE)).toBeNull();
    expect(screen.queryByText(ChatRoomMock.TITLE)).toBeNull();
    expect(screen.queryByLabelText(/loading/i)).toBeNull();
  });

  it('should display a non-initial navigation error message and a retry button', async () => {
    const error = { message: 'Test navigation error', url: '/' };
    navigationMock.error.mockImplementation(() => error);
    await renderComponent();
    expect(screen.getByText(error.message));
    expect(screen.getByRole('button', { name: /retry/i }));
    expect(screen.getByText(ChatListMock.TITLE)).toBeVisible();
    expect(screen.queryByText(ChatRoomMock.TITLE)).toBeNull();
    expect(screen.queryByLabelText(/loading/i)).toBeNull();
  });

  it('should navigate to `/profiles`', async () => {
    const user = userEvent.setup();
    await renderComponent();
    await user.click(screen.getByRole('link', { name: /profiles/i }));
    await vi.waitFor(() => expect(screen.getByText(ProfileListMock.TITLE)).toBeVisible());
    expect(screen.getByRole('link', { name: /chats/i })).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('link', { name: /profiles/i })).toHaveAttribute('aria-current', 'page');
  });

  it('should navigate to `/chats`', async () => {
    const user = userEvent.setup();
    await renderComponent({ initialRoute: '/profiles' });
    await user.click(screen.getByRole('link', { name: /chats/i }));
    await vi.waitFor(() => expect(screen.getByText(ChatListMock.TITLE)).toBeVisible());
    expect(screen.getByRole('link', { name: /profiles/i })).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('link', { name: /chats/i })).toHaveAttribute('aria-current', 'page');
  });

  const urls = ['/chats', '/chats/test-chat-id', '/profiles', '/profiles/test-profile-id'];
  for (const initialRoute of urls) {
    describe(initialRoute, () => {
      it('should display the main menu on a wide screen', async () => {
        const originalVPWidth = window.innerWidth;
        window.innerWidth = 720;
        await renderComponent({ initialRoute });
        const profilesLink = screen.getByRole('link', { name: /profiles/i });
        const chatsLink = screen.getByRole('link', { name: /chats/i });
        if (initialRoute.startsWith('/chats')) {
          expect(screen.getByText(ChatListMock.TITLE)).toBeVisible();
          expect(screen.queryByText(ProfileListMock.TITLE)).toBeNull();
        } else if (initialRoute.startsWith('/profiles')) {
          expect(screen.getByText(ProfileListMock.TITLE)).toBeVisible();
          expect(screen.queryByText(ChatListMock.TITLE)).toBeNull();
        }
        if (initialRoute.endsWith('/chats')) {
          expect(chatsLink).toHaveAttribute('aria-current', 'page');
          expect(profilesLink).not.toHaveAttribute('aria-current');
        } else if (initialRoute.endsWith('/profiles')) {
          expect(profilesLink).toHaveAttribute('aria-current', 'page');
          expect(chatsLink).not.toHaveAttribute('aria-current');
        }
        if (initialRoute.endsWith('/chats') || initialRoute.endsWith('/profiles')) {
          expect(screen.queryByText(ChatRoomMock.TITLE)).toBeNull();
        } else {
          expect(screen.getByText(ChatRoomMock.TITLE)).toBeVisible();
        }
        window.innerWidth = originalVPWidth;
      });

      it('should not display the main menu on a narrow screen', async () => {
        const originalVPWidth = window.innerWidth;
        window.innerWidth = 320;
        await renderComponent({ initialRoute });
        if (initialRoute.endsWith('/chats')) {
          const profilesLink = screen.getByRole('link', { name: /profiles/i });
          const chatsLink = screen.getByRole('link', { name: /chats/i });
          expect(chatsLink).toHaveAttribute('aria-current', 'page');
          expect(profilesLink).not.toHaveAttribute('aria-current');
          expect(screen.getByText(ChatListMock.TITLE)).toBeVisible();
          expect(screen.queryByText(ChatRoomMock.TITLE)).toBeNull();
          expect(screen.queryByText(ProfileListMock.TITLE)).toBeNull();
        } else if (initialRoute.endsWith('/profiles')) {
          const profilesLink = screen.getByRole('link', { name: /profiles/i });
          const chatsLink = screen.getByRole('link', { name: /chats/i });
          expect(profilesLink).toHaveAttribute('aria-current', 'page');
          expect(chatsLink).not.toHaveAttribute('aria-current');
          expect(screen.getByText(ProfileListMock.TITLE)).toBeVisible();
          expect(screen.queryByText(ChatListMock.TITLE)).toBeNull();
          expect(screen.queryByText(ChatRoomMock.TITLE)).toBeNull();
        } else {
          expect(screen.queryByRole('link', { name: /profiles/i })).toBeNull();
          expect(screen.queryByRole('link', { name: /chats/i })).toBeNull();
          expect(screen.queryByText(ProfileListMock.TITLE)).toBeNull();
          expect(screen.getByText(ChatRoomMock.TITLE)).toBeVisible();
          expect(screen.queryByText(ChatListMock.TITLE)).toBeNull();
        }
        window.innerWidth = originalVPWidth;
      });

      it('should not display the main menu, if the singular view enabled', async () => {
        singularViewMock.disabled.mockImplementation(() => false);
        singularViewMock.enabled.mockImplementation(() => true);
        const originalVPWidth = window.innerWidth;
        window.innerWidth = 720;
        await renderComponent({ initialRoute, autoDetectChanges: true });
        const profilesLink = screen.queryByRole('link', { name: /profiles/i });
        const chatsLink = screen.queryByRole('link', { name: /chats/i });
        expect(screen.queryByRole('button', { name: /close/i })).toBeNull();
        expect(screen.getByRole('button', { name: /open/i })).toBeVisible();
        if (initialRoute.endsWith('/chats')) {
          expect(screen.queryByText(ChatRoomMock.TITLE)).toBeNull();
          expect(screen.getByText(ChatListMock.TITLE)).toBeVisible();
          expect(screen.queryByText(ProfileListMock.TITLE)).toBeNull();
          expect(chatsLink).toHaveAttribute('aria-current', 'page');
          expect(profilesLink).not.toHaveAttribute('aria-current');
        } else if (initialRoute.endsWith('/profiles')) {
          expect(screen.queryByText(ChatRoomMock.TITLE)).toBeNull();
          expect(screen.queryByText(ChatListMock.TITLE)).toBeNull();
          expect(screen.getByText(ProfileListMock.TITLE)).toBeVisible();
          expect(profilesLink).toHaveAttribute('aria-current', 'page');
          expect(chatsLink).not.toHaveAttribute('aria-current');
        } else {
          expect(screen.queryByText(ChatListMock.TITLE)).toBeNull();
          expect(screen.queryByText(ProfileListMock.TITLE)).toBeNull();
          expect(screen.getByText(ChatRoomMock.TITLE)).toBeVisible();
          expect(profilesLink).toBeNull();
          expect(chatsLink).toBeNull();
        }
        window.innerWidth = originalVPWidth;
      });

      it('should display the main menu, if singular view disabled', async () => {
        singularViewMock.disabled.mockImplementation(() => true);
        singularViewMock.enabled.mockImplementation(() => false);
        const originalVPWidth = window.innerWidth;
        window.innerWidth = 720;
        await renderComponent({ initialRoute });
        const profilesLink = screen.getByRole('link', { name: /profiles/i });
        const chatsLink = screen.getByRole('link', { name: /chats/i });
        if (initialRoute.startsWith('/chats')) {
          expect(screen.getByText(ChatListMock.TITLE)).toBeVisible();
          expect(screen.queryByText(ProfileListMock.TITLE)).toBeNull();
        } else {
          expect(screen.getByText(ProfileListMock.TITLE)).toBeVisible();
          expect(screen.queryByText(ChatListMock.TITLE)).toBeNull();
        }
        if (initialRoute.endsWith('/chats')) {
          expect(chatsLink).toHaveAttribute('aria-current', 'page');
          expect(profilesLink).not.toHaveAttribute('aria-current');
        } else if (initialRoute.endsWith('/profiles')) {
          expect(profilesLink).toHaveAttribute('aria-current', 'page');
          expect(chatsLink).not.toHaveAttribute('aria-current');
        }
        if (!initialRoute.endsWith('/chats') && !initialRoute.endsWith('/profiles')) {
          expect(screen.getByText(ChatRoomMock.TITLE)).toBeVisible();
        }
        expect(screen.getByRole('button', { name: /close/i })).toBeVisible();
        window.innerWidth = originalVPWidth;
      });

      it('should not display the main menu after narrowing the screen', async () => {
        const originalVPWidth = window.innerWidth;
        window.innerWidth = 720;
        await renderComponent({ initialRoute });
        window.innerWidth = 320;
        fireEvent.resize(window);
        if (initialRoute.endsWith('/chats')) {
          const profilesLink = screen.getByRole('link', { name: /profiles/i });
          const chatsLink = screen.getByRole('link', { name: /chats/i });
          await vi.waitFor(() => expect(chatsLink).toHaveAttribute('aria-current', 'page'));
          expect(profilesLink).not.toHaveAttribute('aria-current');
          expect(screen.getByText(ChatListMock.TITLE)).toBeVisible();
          expect(screen.queryByText(ChatRoomMock.TITLE)).toBeNull();
          expect(screen.queryByText(ProfileListMock.TITLE)).toBeNull();
        } else if (initialRoute.endsWith('/profiles')) {
          const profilesLink = screen.getByRole('link', { name: /profiles/i });
          const chatsLink = screen.getByRole('link', { name: /chats/i });
          await vi.waitFor(() => expect(profilesLink).toHaveAttribute('aria-current', 'page'));
          expect(chatsLink).not.toHaveAttribute('aria-current');
          expect(screen.getByText(ProfileListMock.TITLE)).toBeVisible();
          expect(screen.queryByText(ChatListMock.TITLE)).toBeNull();
          expect(screen.queryByText(ChatRoomMock.TITLE)).toBeNull();
        } else {
          expect(screen.queryByRole('link', { name: /profiles/i })).toBeNull();
          expect(screen.queryByRole('link', { name: /chats/i })).toBeNull();
          expect(screen.queryByText(ProfileListMock.TITLE)).toBeNull();
          expect(screen.getByText(ChatRoomMock.TITLE)).toBeVisible();
          expect(screen.queryByText(ChatListMock.TITLE)).toBeNull();
        }
        window.innerWidth = originalVPWidth;
      });

      it('should display the main menu after widening screen', async () => {
        const originalVPWidth = window.innerWidth;
        window.innerWidth = 320;
        await renderComponent({ initialRoute });
        window.innerWidth = 720;
        fireEvent.resize(window);
        const profilesLink = screen.getByRole('link', { name: /profiles/i });
        const chatsLink = screen.getByRole('link', { name: /chats/i });
        if (initialRoute.startsWith('/chats')) {
          await vi.waitFor(() => expect(screen.getByText(ChatListMock.TITLE)).toBeVisible());
          expect(screen.queryByText(ProfileListMock.TITLE)).toBeNull();
        } else if (initialRoute.startsWith('/profiles')) {
          await vi.waitFor(() => expect(screen.getByText(ProfileListMock.TITLE)).toBeVisible());
          expect(screen.queryByText(ChatListMock.TITLE)).toBeNull();
        }
        if (initialRoute.endsWith('/chats')) {
          expect(chatsLink).toHaveAttribute('aria-current', 'page');
          expect(profilesLink).not.toHaveAttribute('aria-current');
        } else if (initialRoute.endsWith('/profiles')) {
          expect(profilesLink).toHaveAttribute('aria-current', 'page');
          expect(chatsLink).not.toHaveAttribute('aria-current');
        }
        if (initialRoute.endsWith('/chats') || initialRoute.endsWith('/profiles')) {
          expect(screen.queryByText(ChatRoomMock.TITLE)).toBeNull();
        } else {
          expect(screen.getByText(ChatRoomMock.TITLE)).toBeVisible();
        }
        window.innerWidth = originalVPWidth;
      });
    });
  }
});
