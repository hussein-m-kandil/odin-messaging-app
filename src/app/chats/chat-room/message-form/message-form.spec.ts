import { asyncScheduler, Observable, observeOn, of, Subscriber, throwError } from 'rxjs';
import { HttpErrorResponse, HttpEventType, HttpResponse } from '@angular/common/http';
import { screen, render, RenderComponentOptions } from '@testing-library/angular';
import { Component, input, output, OutputEmitterRef } from '@angular/core';
import { ImagePicker } from '../../../images/image-picker';
import { userEvent } from '@testing-library/user-event';
import { ReactiveFormsModule } from '@angular/forms';
import { ColorScheme } from '../../../color-scheme';
import { NgTemplateOutlet } from '@angular/common';
import { ButtonDirective } from 'primeng/button';
import { MessageService } from 'primeng/api';
import { MessageForm } from './message-form';
import { Textarea } from 'primeng/textarea';
import { Toast } from 'primeng/toast';
import { Chats } from '../../chats';
import { Mock } from 'vitest';

const profileId = crypto.randomUUID();
const chatId = crypto.randomUUID();

const newMessageData = { body: 'Hi!', image: null };
const newChatData = { profiles: [profileId], message: newMessageData };

const chatsMock = { createChat: vi.fn(), createMessage: vi.fn() };

const commonProviders: RenderComponentOptions<MessageForm>['providers'] = [
  { provide: ColorScheme, useValue: { selectedScheme: vi.fn(() => ({ value: 'light' })) } },
  { provide: Chats, useValue: chatsMock },
  MessageService,
];

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
    providers: [...commonProviders, ...(providers || [])],
    imports: [MessageForm, Toast],
    autoDetectChanges: false,
    ...options,
  });
};

const getFormElements = () => {
  const imagePickerBtn = screen.getByRole('button', { name: /show image picker/i });
  const emojiPickerBtn = screen.getByRole('button', { name: /show emoji picker/i });
  const msgInp = screen.getByRole('textbox', { name: /message/i });
  const msgForm = screen.getByRole('form', { name: /message/i });
  const sendBtn = screen.getByRole('button', { name: /send/i });
  return { imagePickerBtn, emojiPickerBtn, sendBtn, msgForm, msgInp };
};

describe('MessageForm', () => {
  afterEach(vi.resetAllMocks);

  it('should throw an error if not given `chatId` nor `profileId`', async () => {
    const chatId = '';
    const profileId = '';
    await expect(() => renderComponent({ inputs: { chatId, profileId } })).rejects.toThrowError(
      /missing (.+ )?input/i,
    );
  });

  const testData: {
    inputs: { chatId?: string; profileId?: string };
    type: 'chat' | 'message';
    createMock: Mock;
  }[] = [
    { type: 'message', inputs: { chatId }, createMock: chatsMock.createMessage },
    { type: 'chat', inputs: { profileId }, createMock: chatsMock.createChat },
  ];

  for (const { type, createMock, inputs } of testData) {
    describe(`Create ${type}`, () => {
      it('should display a form with fields', async () => {
        await renderComponent({ inputs });
        const { msgInp, msgForm, sendBtn, imagePickerBtn } = getFormElements();
        expect(msgInp).toBeVisible();
        expect(msgForm).toBeVisible();
        expect(sendBtn).toBeVisible();
        expect(imagePickerBtn).toBeVisible();
      });

      it('should toggle an image picker', async () => {
        await renderComponent({ inputs });
        const actor = userEvent.setup();
        const { imagePickerBtn, msgInp } = getFormElements();
        expect(screen.queryByRole('button', { name: /pick .*image/i })).toBeNull();
        expect(screen.queryByLabelText(/browse files/i)).toBeNull();
        expect(screen.queryByRole('progressbar')).toBeNull();
        await actor.click(imagePickerBtn);
        expect(screen.getByRole('button', { name: /pick .*image/i })).toBeVisible();
        expect(screen.getByLabelText(/browse files/i)).toBeInTheDocument();
        expect(screen.getByRole('progressbar')).toHaveValue(0);
        expect(msgInp).not.toHaveFocus();
        await actor.click(imagePickerBtn);
        expect(screen.queryByRole('button', { name: /pick .*image/i })).toBeNull();
        expect(screen.queryByLabelText(/browse files/i)).toBeNull();
        expect(screen.queryByRole('progressbar')).toBeNull();
        expect(msgInp).toHaveFocus();
      });

      it('should toggle an emoji picker', async () => {
        await renderComponent({ inputs });
        const actor = userEvent.setup();
        const { emojiPickerBtn, msgInp } = getFormElements();
        expect(screen.queryByLabelText(/^emoji picker/i)).toBeNull();
        await actor.click(emojiPickerBtn);
        expect(screen.getByLabelText(/^emoji picker/i)).toBeVisible();
        expect(msgInp).not.toHaveFocus();
        await actor.click(emojiPickerBtn);
        expect(screen.queryByLabelText(/^emoji picker/i)).toBeNull();
        expect(msgInp).toHaveFocus();
      });

      it('should switch between the pickers when opening one while the other one is open', async () => {
        await renderComponent({ inputs });
        const actor = userEvent.setup();
        const { imagePickerBtn, emojiPickerBtn, msgInp } = getFormElements();
        expect(screen.queryByRole('button', { name: /pick .*image/i })).toBeNull();
        expect(screen.queryByLabelText(/^emoji picker/i)).toBeNull();
        expect(screen.queryByLabelText(/browse files/i)).toBeNull();
        await actor.click(emojiPickerBtn);
        expect(screen.queryByRole('button', { name: /pick .*image/i })).toBeNull();
        expect(screen.getByLabelText(/^emoji picker/i)).toBeVisible();
        expect(screen.queryByLabelText(/browse files/i)).toBeNull();
        expect(msgInp).not.toHaveFocus();
        await actor.click(imagePickerBtn);
        expect(screen.getByRole('button', { name: /pick .*image/i })).toBeVisible();
        expect(screen.getByLabelText(/browse files/i)).toBeInTheDocument();
        expect(screen.queryByLabelText(/^emoji picker/i)).toBeNull();
        expect(msgInp).not.toHaveFocus();
        await actor.click(emojiPickerBtn);
        expect(screen.queryByRole('button', { name: /pick .*image/i })).toBeNull();
        expect(screen.getByLabelText(/^emoji picker/i)).toBeVisible();
        expect(screen.queryByLabelText(/browse files/i)).toBeNull();
        expect(msgInp).not.toHaveFocus();
        await actor.click(imagePickerBtn);
        expect(screen.getByRole('button', { name: /pick .*image/i })).toBeVisible();
        expect(screen.getByLabelText(/browse files/i)).toBeInTheDocument();
        expect(screen.queryByLabelText(/^emoji picker/i)).toBeNull();
        expect(msgInp).not.toHaveFocus();
        await actor.click(imagePickerBtn);
        expect(screen.queryByRole('button', { name: /pick .*image/i })).toBeNull();
        expect(screen.queryByLabelText(/^emoji picker/i)).toBeNull();
        expect(screen.queryByLabelText(/browse files/i)).toBeNull();
        expect(msgInp).toHaveFocus();
      });

      it('should insert the picked emoji at the cart place of the message textbox', async () => {
        const actor = userEvent.setup();
        let pickedOutputMock!: OutputEmitterRef<unknown>;
        @Component({ selector: 'app-emoji-picker', template: `` })
        class EmojiPicker {
          readonly theme = input<string>();
          readonly picked = output<unknown>();
          constructor() {
            pickedOutputMock = this.picked;
          }
        }
        await render(MessageForm, {
          componentImports: [
            ReactiveFormsModule,
            NgTemplateOutlet,
            ButtonDirective,
            ImagePicker,
            EmojiPicker,
            Textarea,
          ],
          providers: commonProviders,
          inputs,
        });
        const { msgInp, emojiPickerBtn } = getFormElements();
        const textValue = 'Hello, Emojis!';
        await actor.click(emojiPickerBtn);
        await actor.type(msgInp, textValue);
        pickedOutputMock.emit({ native: '😎' });
        await actor.pointer([{ target: msgInp, offset: 5, keys: '[MouseLeft>]' }, { offset: 7 }]);
        pickedOutputMock.emit({ native: '😌' });
        await actor.pointer({ target: msgInp, offset: 13, keys: '[MouseLeft]' });
        pickedOutputMock.emit({ native: '🤡' });
        pickedOutputMock.emit({ native: '🎉' });
        expect(msgInp).toHaveValue('Hello😌Emojis🤡🎉!😎');
      });

      it('should create', async () => {
        let sub!: Subscriber<unknown>;
        createMock.mockImplementation(() => new Observable((s) => (sub = s)));
        const actor = userEvent.setup();
        await renderComponent({ inputs });
        const { msgInp, sendBtn, imagePickerBtn } = getFormElements();
        await actor.type(msgInp, newMessageData.body);
        await actor.click(sendBtn);
        expect(msgInp).toBeDisabled();
        expect(sendBtn).toBeDisabled();
        expect(imagePickerBtn).toBeDisabled();
        sub.next(new HttpResponse({ status: 201 }));
        sub.complete();
        if (type === 'chat') expect(createMock).toHaveBeenCalledExactlyOnceWith(newChatData);
        else expect(createMock).toHaveBeenCalledExactlyOnceWith(chatId, newMessageData);
        expect(msgInp).toHaveValue('');
        expect(msgInp).toHaveFocus();
      });

      it('should create with an image', async () => {
        let sub!: Subscriber<unknown>;
        createMock.mockImplementation(() => new Observable((s) => (sub = s)));
        const messageTestData = {
          ...newMessageData,
          image: new File([], 'img.png', { type: 'image/png' }),
        };
        const chatTestData = { ...newChatData, message: messageTestData };
        const actor = userEvent.setup();
        const { detectChanges } = await renderComponent({ inputs });
        const { msgInp, sendBtn, imagePickerBtn } = getFormElements();
        await actor.click(imagePickerBtn);
        const fileInp = screen.getByLabelText(/browse files/i);
        await actor.upload(fileInp, messageTestData.image);
        await actor.type(msgInp, messageTestData.body);
        await actor.click(sendBtn);
        expect(msgInp).toBeDisabled();
        expect(sendBtn).toBeDisabled();
        expect(fileInp).toBeDisabled();
        expect(imagePickerBtn).toBeDisabled();
        sub.next({ type: HttpEventType.UploadProgress, loaded: 3.5, total: 10 });
        detectChanges();
        expect(screen.getByRole('progressbar')).toHaveValue(35);
        sub.next(new HttpResponse({ status: 201 }));
        sub.complete();
        if (type === 'chat') expect(createMock).toHaveBeenCalledExactlyOnceWith(chatTestData);
        else expect(createMock).toHaveBeenCalledExactlyOnceWith(chatId, messageTestData);
        detectChanges();
        expect(screen.queryByRole('button', { name: /pick .*image/i })).toBeNull();
        expect(screen.queryByLabelText(/browse files/i)).toBeNull();
        expect(msgInp).toHaveValue('');
        expect(msgInp).toHaveFocus();
        await actor.click(imagePickerBtn);
        expect(screen.getByLabelText(/browse files/i)).toHaveValue('');
        expect(screen.getByRole('progressbar')).toHaveValue(0);
      });

      it('should display image-upload error toast', async () => {
        vi.useFakeTimers();
        let sub!: Subscriber<unknown>;
        createMock.mockImplementation(() => new Observable((s) => (sub = s)));
        const messageTestData = {
          ...newMessageData,
          image: new File([], 'img.png', { type: 'image/png' }),
        };
        const chatTestData = { ...newChatData, message: messageTestData };
        const actor = userEvent.setup({ advanceTimers: vi.advanceTimersByTimeAsync });
        const { detectChanges } = await renderComponent({ inputs });
        const { msgInp, sendBtn, imagePickerBtn } = getFormElements();
        await actor.click(imagePickerBtn);
        const fileInp = screen.getByLabelText(/browse files/i);
        await actor.upload(fileInp, messageTestData.image);
        await actor.type(msgInp, messageTestData.body);
        await actor.click(sendBtn);
        expect(msgInp).toBeDisabled();
        expect(sendBtn).toBeDisabled();
        expect(fileInp).toBeDisabled();
        expect(imagePickerBtn).toBeDisabled();
        sub.next({ type: HttpEventType.UploadProgress, loaded: 3.5, total: 10 });
        detectChanges();
        expect(screen.getByRole('progressbar')).toHaveValue(35);
        sub.error(new Error('Test error'));
        if (type === 'chat') expect(createMock).toHaveBeenCalledExactlyOnceWith(chatTestData);
        else expect(createMock).toHaveBeenCalledExactlyOnceWith(chatId, messageTestData);
        detectChanges();
        expect(screen.getByRole('button', { name: /^pick .*image/i })).toBeVisible();
        expect(screen.getByText(/failed to send your message/i)).toBeVisible();
        expect(screen.getByLabelText(/browse files/i)).toBeInTheDocument();
        expect(screen.getByText(/message failed/i)).toBeVisible();
        expect(screen.getByRole('progressbar')).toHaveValue(0);
        expect(msgInp).toHaveValue(messageTestData.body);
        expect(msgInp).toHaveFocus();
        await vi.runAllTimersAsync();
        expect(screen.queryByText(/message failed/i)).toBeNull();
        expect(screen.queryByText(/failed to send your message/i)).toBeNull();
        vi.useRealTimers();
      });

      it('should not submit again while submitting', async () => {
        createMock.mockImplementation(() =>
          of(new HttpResponse({ status: 201 })).pipe(observeOn(asyncScheduler, 700)),
        );
        const actor = userEvent.setup();
        await renderComponent({ inputs });
        const { msgInp, sendBtn } = getFormElements();
        await actor.type(msgInp, newMessageData.body);
        await actor.click(sendBtn);
        if (type === 'chat') expect(createMock).toHaveBeenCalledExactlyOnceWith(newChatData);
        else expect(createMock).toHaveBeenCalledExactlyOnceWith(chatId, newMessageData);
        expect(msgInp).toHaveValue(newMessageData.body);
        expect(sendBtn).toBeDisabled();
        expect(sendBtn).toHaveFocus();
      });

      it('should display a toast error message', async () => {
        vi.useFakeTimers();
        createMock.mockImplementation(() => throwError(() => new Error('Test error')));
        const actor = userEvent.setup({ advanceTimers: vi.advanceTimersByTimeAsync });
        await renderComponent({ inputs });
        const { msgInp, sendBtn } = getFormElements();
        await actor.type(msgInp, newMessageData.body);
        await actor.click(sendBtn);
        if (type === 'chat') expect(createMock).toHaveBeenCalledExactlyOnceWith(newChatData);
        else expect(createMock).toHaveBeenCalledExactlyOnceWith(chatId, newMessageData);
        expect(screen.getByText(/message failed/i)).toBeVisible();
        expect(screen.getByText(/failed to send your message/i)).toBeVisible();
        expect(msgInp).toHaveValue(newMessageData.body);
        expect(msgInp).toHaveFocus();
        await vi.runAllTimersAsync();
        expect(screen.queryByText(/message failed/i)).toBeNull();
        expect(screen.queryByText(/failed to send your message/i)).toBeNull();
        vi.useRealTimers();
      });

      it('should display a toast backend-error message', async () => {
        vi.useFakeTimers();
        const errRes = new HttpErrorResponse({
          error: { error: { message: 'Bad request' } },
          statusText: 'Bad request',
          status: 400,
        });
        createMock.mockImplementation(() => throwError(() => errRes));
        const actor = userEvent.setup({ advanceTimers: vi.advanceTimersByTimeAsync });
        await renderComponent({ inputs });
        const { msgInp, sendBtn } = getFormElements();
        await actor.type(msgInp, newMessageData.body);
        await actor.click(sendBtn);
        if (type === 'chat') expect(createMock).toHaveBeenCalledExactlyOnceWith(newChatData);
        else expect(createMock).toHaveBeenCalledExactlyOnceWith(chatId, newMessageData);
        expect(screen.getByText(/message failed/i)).toBeVisible();
        expect(screen.getByText(errRes.error.error.message)).toBeVisible();
        expect(msgInp).toHaveValue(newMessageData.body);
        expect(msgInp).toHaveFocus();
        await vi.runAllTimersAsync();
        expect(screen.queryByText(/message failed/i)).toBeNull();
        expect(screen.queryByText(errRes.error.error.message)).toBeNull();
        vi.useRealTimers();
      });
    });
  }
});
