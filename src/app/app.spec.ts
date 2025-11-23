import { render, screen } from '@testing-library/angular';
import { App } from './app';

const renderComponent = () => {
  return render(App);
};

describe('App', () => {
  it('should render title', async () => {
    await renderComponent();
    expect(screen.getByRole('heading', { name: 'Hello, odin-messaging-app' })).toBeVisible();
  });
});
