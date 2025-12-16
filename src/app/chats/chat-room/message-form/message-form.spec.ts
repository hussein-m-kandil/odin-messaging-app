import { screen, render, RenderComponentOptions } from '@testing-library/angular';
import { userEvent } from '@testing-library/user-event';
import { asyncScheduler, observeOn, of, throwError } from 'rxjs';
import { MessageForm } from './message-form';
import { Messages } from '../messages';
import { Chats } from '../../chats';

const profileId = crypto.randomUUID();
const chatId = crypto.randomUUID();

const newMessageData = { body: 'Hi!' };
const newChatData = { profiles: [profileId], message: { body: 'Hi!' } };

const messagesMock = { create: vi.fn() };
const chatsMock = { create: vi.fn() };

const renderComponent = ({ providers, ...options }: RenderComponentOptions<MessageForm> = {}) => {
  return render(MessageForm, {
    providers: [
      { provide: Messages, useValue: messagesMock },
      { provide: Chats, useValue: chatsMock },
      ...(providers || []),
    ],
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
    await expect(async () => await renderComponent()).rejects.toThrowError(/missing (.+ )?input/i);
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
    messagesMock.create.mockImplementation(() => of(null));
    const { click, type } = userEvent.setup();
    await renderComponent({ inputs: { chatId } });
    const { msgInp, sendBtn } = getFormElements();
    await type(msgInp, newMessageData.body);
    await click(sendBtn);
    expect(messagesMock.create).toHaveBeenCalledExactlyOnceWith(chatId, newMessageData);
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
    messagesMock.create.mockImplementation(() => of(null).pipe(observeOn(asyncScheduler, 700)));
    const { click, type } = userEvent.setup();
    await renderComponent({ inputs: { chatId } });
    const { msgInp, sendBtn } = getFormElements();
    await type(msgInp, newMessageData.body);
    await click(sendBtn);
    await click(sendBtn);
    await click(sendBtn);
    expect(messagesMock.create).toHaveBeenCalledExactlyOnceWith(chatId, newMessageData);
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
    messagesMock.create.mockImplementation(() => throwError(() => new Error('Test error')));
    const { click, type } = userEvent.setup();
    await renderComponent({ inputs: { chatId } });
    const { msgInp, sendBtn } = getFormElements();
    await type(msgInp, newMessageData.body);
    await click(sendBtn);
    expect(messagesMock.create).toHaveBeenCalledExactlyOnceWith(chatId, newMessageData);
    expect(screen.getByText(/failed/i)).toBeVisible();
    expect(msgInp).toHaveValue(newMessageData.body);
    expect(msgInp).toHaveFocus();
    await type(msgInp, ' ');
    expect(screen.queryByText(/failed/i)).toBeNull();
  });

  it('should display a create chat error, then remove it on the first interaction', async () => {
    chatsMock.create.mockImplementation(() => throwError(() => new Error('Test error')));
    const { click, type } = userEvent.setup();
    await renderComponent({ inputs: { profileId } });
    const { msgInp, sendBtn } = getFormElements();
    await type(msgInp, newChatData.message.body);
    await click(sendBtn);
    expect(chatsMock.create).toHaveBeenCalledExactlyOnceWith(newChatData);
    expect(screen.getByText(/failed/i)).toBeVisible();
    expect(msgInp).toHaveValue(newMessageData.body);
    expect(msgInp).toHaveFocus();
    await type(msgInp, ' ');
    expect(screen.queryByText(/failed/i)).toBeNull();
  });
});
