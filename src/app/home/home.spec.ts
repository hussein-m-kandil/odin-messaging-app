import { fireEvent, render, RenderComponentOptions, screen } from '@testing-library/angular';
import { userEvent } from '@testing-library/user-event';
import { provideRouter } from '@angular/router';
import { Component } from '@angular/core';
import { Home } from './home';
import { of } from 'rxjs';

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

const resolve = { testData: vi.fn(() => of(null)) };

const testRoutes = [
  {
    path: '',
    resolve,
    children: [
      {
        path: 'profiles',
        children: [
          { path: '', outlet: 'menu', component: ProfileListMock },
          { path: ':profileId', component: ChatRoomMock },
        ],
      },
      {
        path: 'chats',
        children: [
          { path: '', outlet: 'menu', component: ChatListMock },
          { path: ':chatId', component: ChatRoomMock },
        ],
      },
      { path: '**', redirectTo: 'chats' },
    ],
  },
];

const renderComponent = ({ providers, ...options }: RenderComponentOptions<Home> = {}) => {
  return render(Home, {
    providers: [provideRouter(testRoutes), ...(providers || [])],
    ...options,
  });
};

describe('Home', () => {
  afterEach(vi.resetAllMocks);

  it('should create', async () => {
    const { fixture } = await renderComponent();
    expect(fixture.componentInstance).toBeTruthy();
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
