import { screen, render, RenderComponentOptions } from '@testing-library/angular';
import { userEvent } from '@testing-library/user-event';
import { asyncScheduler, observeOn, of, throwError } from 'rxjs';
import { MessageForm } from './message-form';
import { Chats } from '../../chats';
import { MessageService } from 'primeng/api';
import { Toast } from 'primeng/toast';

const profileId = crypto.randomUUID();
const chatId = crypto.randomUUID();

const newMessageData = { body: 'Hi!' };
const newChatData = { profiles: [profileId], message: { body: 'Hi!' } };

const chatsMock = { create: vi.fn(), createMessage: vi.fn() };

const renderComponent = ({
  providers,
  inputs,
  ...options
}: RenderComponentOptions<MessageForm> = {}) => {
  const { chatId, profileId } = inputs || {};
  const componentTemplate =
    chatId && profileId
      ? `<app-message-form chatId="${chatId}" profileId="${profileId}" />`
      : chatId
      ? `<app-message-form chatId="${chatId}" />`
      : profileId
      ? `<app-message-form profileId="${profileId}" />`
      : `<app-message-form />`;
  return render(`${componentTemplate}<p-toast />`, {
    imports: [MessageForm, Toast],
    providers: [MessageService, { provide: Chats, useValue: chatsMock }, ...(providers || [])],
    autoDetectChanges: false,
    ...options,
  });
};

const getFormElements = () => {
  const msgInp = screen.getByRole('textbox', { name: /message/i });
  const msgForm = screen.getByRole('form', { name: /message/i });
  const sendBtn = screen.getByRole('button', { name: /send/i });
  return { msgInp, msgForm, sendBtn };
};

describe('MessageForm', () => {
  afterEach(vi.resetAllMocks);

  it('should throw an error if not given `chatId` nor `profileId`', async () => {
    const chatId = '';
    const profileId = '';
    await expect(() => renderComponent({ inputs: { chatId, profileId } })).rejects.toThrowError(
      /missing (.+ )?input/i
    );
  });

  it('should display a message form', async () => {
    await renderComponent({ inputs: { chatId } });
    const { msgInp, msgForm, sendBtn } = getFormElements();
    expect(msgInp).toBeVisible();
    expect(msgForm).toBeVisible();
    expect(sendBtn).toBeVisible();
  });

  it('should display a chat form', async () => {
    await renderComponent({ inputs: { profileId } });
    const { msgInp, msgForm, sendBtn } = getFormElements();
    expect(msgInp).toBeVisible();
    expect(msgForm).toBeVisible();
    expect(sendBtn).toBeVisible();
  });

  it('should create a message by clicking the send button', async () => {
    chatsMock.createMessage.mockImplementation(() => of(null));
    const { click, type } = userEvent.setup();
    await renderComponent({ inputs: { chatId } });
    const { msgInp, sendBtn } = getFormElements();
    await type(msgInp, newMessageData.body);
    await click(sendBtn);
    expect(chatsMock.createMessage).toHaveBeenCalledExactlyOnceWith(chatId, newMessageData);
    expect(msgInp).toHaveValue('');
    expect(msgInp).toHaveFocus();
  });

  it('should create a chat', async () => {
    chatsMock.create.mockImplementation(() => of(null));
    const { click, type } = userEvent.setup();
    await renderComponent({ inputs: { profileId } });
    const { msgInp, sendBtn } = getFormElements();
    await type(msgInp, newChatData.message.body);
    await click(sendBtn);
    expect(chatsMock.create).toHaveBeenCalledExactlyOnceWith(newChatData);
    expect(msgInp).toHaveValue('');
    expect(msgInp).toHaveFocus();
  });

  it('should not submit again while submitting the message form', async () => {
    chatsMock.createMessage.mockImplementation(() => of(null).pipe(observeOn(asyncScheduler, 700)));
    const { click, type } = userEvent.setup();
    await renderComponent({ inputs: { chatId } });
    const { msgInp, sendBtn } = getFormElements();
    await type(msgInp, newMessageData.body);
    await click(sendBtn);
    await click(sendBtn);
    await click(sendBtn);
    expect(chatsMock.createMessage).toHaveBeenCalledExactlyOnceWith(chatId, newMessageData);
    expect(msgInp).toHaveValue(newMessageData.body);
    expect(sendBtn).toHaveFocus();
  });

  it('should not submit again while submitting the chat form', async () => {
    chatsMock.create.mockImplementation(() => of(null).pipe(observeOn(asyncScheduler, 700)));
    const { click, type } = userEvent.setup();
    await renderComponent({ inputs: { profileId } });
    const { msgInp, sendBtn } = getFormElements();
    await type(msgInp, newChatData.message.body);
    await click(sendBtn);
    await click(sendBtn);
    await click(sendBtn);
    expect(chatsMock.create).toHaveBeenCalledExactlyOnceWith(newChatData);
    expect(msgInp).toHaveValue(newMessageData.body);
    expect(sendBtn).toHaveFocus();
  });

  it('should display a create message error, then remove it on the first interaction', async () => {
    vi.useFakeTimers();
    chatsMock.createMessage.mockImplementation(() => throwError(() => new Error('Test error')));
    const { click, type } = userEvent.setup({ advanceTimers: vi.advanceTimersByTimeAsync });
    await renderComponent({ inputs: { chatId } });
    const { msgInp, sendBtn } = getFormElements();
    await type(msgInp, newMessageData.body);
    await click(sendBtn);
    expect(chatsMock.createMessage).toHaveBeenCalledExactlyOnceWith(chatId, newMessageData);
    expect(screen.getByText(/failed message/i)).toBeVisible();
    expect(msgInp).toHaveValue(newMessageData.body);
    expect(msgInp).toHaveFocus();
    await type(msgInp, ' ');
    await vi.runAllTimersAsync();
    expect(screen.queryByText(/failed message/i)).toBeNull();
    vi.useRealTimers();
  });

  it('should display a create chat error, then remove it on the first interaction', async () => {
    vi.useFakeTimers();
    chatsMock.create.mockImplementation(() => throwError(() => new Error('Test error')));
    const { click, type } = userEvent.setup({ advanceTimers: vi.advanceTimersByTimeAsync });
    await renderComponent({ inputs: { profileId } });
    const { msgInp, sendBtn } = getFormElements();
    await type(msgInp, newChatData.message.body);
    await click(sendBtn);
    expect(chatsMock.create).toHaveBeenCalledExactlyOnceWith(newChatData);
    expect(screen.getByText(/failed message/i)).toBeVisible();
    expect(msgInp).toHaveValue(newMessageData.body);
    expect(msgInp).toHaveFocus();
    await type(msgInp, ' ');
    await vi.runAllTimersAsync();
    expect(screen.queryByText(/failed message/i)).toBeNull();
    vi.useRealTimers();
  });
});
