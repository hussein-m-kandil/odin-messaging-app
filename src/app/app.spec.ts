import {
  render,
  screen,
  fireEvent,
  getByRole,
  RenderComponentOptions,
} from '@testing-library/angular';
import { userEvent } from '@testing-library/user-event';
import { ColorScheme, SCHEMES } from './color-scheme';
import { environment } from '../environments';
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { Auth } from './auth';
import { App } from './app';

const consoleLogSpy = vi.spyOn(window.console, 'log');
const consoleErrorSpy = vi.spyOn(window.console, 'error');
const navigationSpy = vi.spyOn(Router.prototype, 'navigateByUrl');

const user = { id: crypto.randomUUID() };

const signOut = vi.fn();
const userMock = vi.fn<() => unknown>(() => user);
const authMock = vi.fn(() => ({ user: userMock, signOut }));

const scheme = SCHEMES[1];
const colorSchemeMock = { scheme: vi.fn(() => scheme), switch: vi.fn() };

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
        path: 'profiles',
        children: [
          { path: '', outlet: 'mainMenu', component: ProfileListMock },
          { path: ':profileId', component: ChatRoomMock },
        ],
      },
      {
        path: 'chats',
        children: [
          { path: '', outlet: 'mainMenu', component: ChatListMock },
          { path: ':chatId', component: ChatRoomMock },
        ],
      },
      { path: '**', redirectTo: 'chats' },
    ],
  },
];

const renderComponent = ({ providers, routes, ...options }: RenderComponentOptions<App> = {}) => {
  return render(App, {
    providers: [
      { provide: ColorScheme, useValue: colorSchemeMock },
      { provide: Auth, useValue: authMock() },
      ...(providers || []),
    ],
    routes: routes || testRoutes,
    ...options,
  });
};

describe('App', () => {
  afterEach(vi.resetAllMocks);

  it('should render the title', async () => {
    await renderComponent();
    const heading = screen.getByRole('heading', { name: new RegExp(environment.title, 'i') });
    expect(heading).toBeVisible();
    expect(getByRole(heading, 'link')).toHaveAttribute('href', '/');
  });

  it('should show loader on navigation', async () => {
    await renderComponent();
    expect(screen.getByLabelText(/loading/i)).toBeVisible();
  });

  it('should not show sign-out button for an unauthenticated user', async () => {
    userMock.mockImplementation(() => null);
    await renderComponent();
    expect(screen.queryByRole('button', { name: /sign ?out/i })).toBeNull();
  });

  it('should show sign-out button for an authenticated user', async () => {
    await renderComponent();
    expect(screen.getByRole('button', { name: /sign ?out/i })).toBeVisible();
  });

  it('should call `signOut` function from the Auth service when clicking the sign-out button', async () => {
    const user = userEvent.setup();
    await renderComponent({ autoDetectChanges: false });
    await user.click(screen.getByRole('button', { name: /sign ?out/i }));
    expect(signOut).toHaveBeenCalledOnce();
    expect(screen.getByText(/bye/i)).toBeVisible();
  });

  it('should show color-scheme switch that indicate to the current color theme', async () => {
    await renderComponent();
    expect(
      screen.getByRole('button', {
        name: new RegExp(`switch color scheme. ${scheme.value} selected`, 'i'),
      })
    ).toBeVisible();
  });

  it('should switch the color scheme on click the color-scheme switch', async () => {
    const { click } = userEvent.setup();
    await renderComponent({ autoDetectChanges: false });
    await click(screen.getByRole('button', { name: /switch color scheme/i }));
    expect(colorSchemeMock.switch).toHaveBeenCalledOnce();
  });

  it('should show a navigation error message and a retry button', async () => {
    resolve.testData.mockImplementationOnce(() =>
      throwError(() => new Error('Test resolve error'))
    );
    consoleErrorSpy.mockImplementationOnce(() => undefined);
    consoleLogSpy.mockImplementationOnce(() => undefined);
    await renderComponent({
      autoDetectChanges: false,
      configureTestBed: (testbed) => {
        testbed.configureTestingModule({ rethrowApplicationErrors: false });
      },
    });
    await vi.waitFor(() => expect(screen.queryByLabelText(/loading/i)).toBeNull());
    expect(screen.getByText(/failed to load/i));
    expect(screen.getByRole('button', { name: /retry/i }));
  });

  it('should navigate to same url again when clicking retry, after a navigation error', async () => {
    resolve.testData.mockImplementationOnce(() =>
      throwError(() => new Error('Test resolve error'))
    );
    consoleErrorSpy.mockImplementationOnce(() => undefined);
    consoleLogSpy.mockImplementationOnce(() => undefined);
    const user = userEvent.setup();
    await renderComponent({
      autoDetectChanges: false,
      configureTestBed: (testbed) => {
        testbed.configureTestingModule({ rethrowApplicationErrors: false });
      },
    });
    await vi.waitFor(() => expect(screen.queryByLabelText(/loading/i)).toBeNull());
    await user.click(screen.getByRole('button', { name: /retry/i }));
    await vi.waitFor(() => expect(screen.queryByLabelText(/loading/i)).toBeNull());
    expect(screen.queryByRole('button', { name: /retry/i })).toBeNull();
    expect(navigationSpy).toHaveBeenCalledExactlyOnceWith('/');
    expect(screen.queryByText(/failed to load/i)).toBeNull();
  });

  it('should redirect to `/chats` and display chat list at the initial route', async () => {
    await renderComponent();
    await vi.waitFor(() => expect(screen.getByText(ChatListMock.TITLE)).toBeVisible());
    expect(screen.getByRole('link', { name: /profiles/i })).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('link', { name: /chats/i })).toHaveAttribute('aria-current', 'page');
  });

  it('should display the chat list when targeting the `/chats` route', async () => {
    await renderComponent({ initialRoute: '/chats' });
    await vi.waitFor(() => expect(screen.getByText(ChatListMock.TITLE)).toBeVisible());
    expect(screen.getByRole('link', { name: /profiles/i })).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('link', { name: /chats/i })).toHaveAttribute('aria-current', 'page');
  });

  it('should display the profile list when targeting the `/profiles` route', async () => {
    await renderComponent({ initialRoute: '/profiles' });
    expect(screen.getByText(ProfileListMock.TITLE)).toBeVisible();
    expect(screen.getByRole('link', { name: /chats/i })).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('link', { name: /profiles/i })).toHaveAttribute('aria-current', 'page');
  });

  it('should navigate to `/profiles` on click the profiles link', async () => {
    const user = userEvent.setup();
    await renderComponent({ initialRoute: '/chats' });
    await user.click(screen.getByRole('link', { name: /profiles/i }));
    await vi.waitFor(() => expect(screen.getByText(ProfileListMock.TITLE)).toBeVisible());
    expect(screen.getByRole('link', { name: /chats/i })).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('link', { name: /profiles/i })).toHaveAttribute('aria-current', 'page');
  });

  it('should navigate to `/chats` on click the chats link', async () => {
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
      it('should display the chat room beside the chat list on a wide screen', async () => {
        const originalVPWidth = window.innerWidth;
        window.innerWidth = 720;
        await renderComponent({ initialRoute });
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

      it('should display the chat room alone on a narrow screen', async () => {
        const originalVPWidth = window.innerWidth;
        window.innerWidth = 320;
        await renderComponent({ initialRoute });
        if (initialRoute.endsWith('/chats')) {
          const profilesLink = screen.getByRole('link', { name: /profiles/i });
          const chatsLink = screen.getByRole('link', { name: /chats/i });
          await vi.waitFor(() => expect(chatsLink).toHaveAttribute('aria-current', 'page'));
          expect(chatsLink).toHaveAttribute('aria-current', 'page');
          expect(profilesLink).not.toHaveAttribute('aria-current');
          expect(screen.getByText(ChatListMock.TITLE)).toBeVisible();
          expect(screen.queryByText(ChatRoomMock.TITLE)).toBeNull();
          expect(screen.queryByText(ProfileListMock.TITLE)).toBeNull();
        } else if (initialRoute.endsWith('/profiles')) {
          const profilesLink = screen.getByRole('link', { name: /profiles/i });
          const chatsLink = screen.getByRole('link', { name: /chats/i });
          await vi.waitFor(() => expect(profilesLink).toHaveAttribute('aria-current', 'page'));
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

      it('should display the chat room beside the chat list after widening screen', async () => {
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

      it('should display the chat room alone after narrowing the screen', async () => {
        const originalVPWidth = window.innerWidth;
        window.innerWidth = 720;
        await renderComponent({ initialRoute });
        window.innerWidth = 320;
        fireEvent.resize(window);
        if (initialRoute.endsWith('/chats')) {
          const profilesLink = screen.getByRole('link', { name: /profiles/i });
          const chatsLink = screen.getByRole('link', { name: /chats/i });
          await vi.waitFor(() => expect(chatsLink).toHaveAttribute('aria-current', 'page'));
          expect(chatsLink).toHaveAttribute('aria-current', 'page');
          expect(profilesLink).not.toHaveAttribute('aria-current');
          expect(screen.getByText(ChatListMock.TITLE)).toBeVisible();
          expect(screen.queryByText(ChatRoomMock.TITLE)).toBeNull();
          expect(screen.queryByText(ProfileListMock.TITLE)).toBeNull();
        } else if (initialRoute.endsWith('/profiles')) {
          const profilesLink = screen.getByRole('link', { name: /profiles/i });
          const chatsLink = screen.getByRole('link', { name: /chats/i });
          await vi.waitFor(() => expect(profilesLink).toHaveAttribute('aria-current', 'page'));
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

      it('should not display a close-list button on a narrow screen, nor the open-list button', async () => {
        const originalVPWidth = window.innerWidth;
        window.innerWidth = 320;
        await renderComponent({ initialRoute });
        expect(screen.queryByRole('button', { name: /close/i })).toBeNull();
        expect(screen.queryByRole('button', { name: /open/i })).toBeNull();
        window.innerWidth = originalVPWidth;
      });

      it('should display a close-list button on a wide screen', async () => {
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

      it('should display an open-list button on a wide screen and remove the list after clicking the list toggler once', async () => {
        const originalVPWidth = window.innerWidth;
        window.innerWidth = 720;
        const user = userEvent.setup();
        await renderComponent({ initialRoute, autoDetectChanges: true });
        await user.click(screen.getByRole('button', { name: /close/i }));
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

      it('should display a close-list button on a wide screen and remove the list after clicking the list toggler twice', async () => {
        const originalVPWidth = window.innerWidth;
        window.innerWidth = 720;
        const user = userEvent.setup();
        await renderComponent({ initialRoute });
        await user.click(screen.getByRole('button', { name: /close/i }));
        await user.click(screen.getByRole('button', { name: /open/i }));
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
    });
  }
});
