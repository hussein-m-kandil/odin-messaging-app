import { ActivatedRouteSnapshot, ResolveFn, RouterStateSnapshot } from '@angular/router';
import { firstValueFrom, isObservable, of } from 'rxjs';
import { TestBed } from '@angular/core/testing';
import { chatResolver } from './chat-resolver';
import { Chat } from './chats.types';
import { Chats } from './chats';

const chatsMock = { getChat: vi.fn(), getChatByMember: vi.fn() };

const setup = () => {
  TestBed.configureTestingModule({ providers: [{ provide: Chats, useValue: chatsMock }] });
  const executeResolver: ResolveFn<Chat | null> = (...resolverParameters) =>
    TestBed.runInInjectionContext(() => chatResolver(...resolverParameters));
  return { executeResolver };
};

const createResolverArgs = (firstArg = {}, secondArg = {}) => {
  return [firstArg as ActivatedRouteSnapshot, secondArg as RouterStateSnapshot] as const;
};

describe('chatResolver', () => {
  afterEach(vi.resetAllMocks);

  it('should return an observer of a chat by id', async () => {
    const chat = { id: crypto.randomUUID(), foo: 'bar' };
    chatsMock.getChat.mockImplementation(() => of(chat));
    const { executeResolver } = setup();
    const result$ = executeResolver(...createResolverArgs({ params: { chatId: chat.id } }));
    const result = isObservable(result$) ? await firstValueFrom(result$) : await result$;
    expect(chatsMock.getChat).toHaveBeenCalledExactlyOnceWith(chat.id);
    expect(result).toBe(chat);
  });

  it('should return an observer of chat by member profile id', async () => {
    const profileId = crypto.randomUUID();
    const chat = { id: crypto.randomUUID(), foo: 'bar' };
    chatsMock.getChatByMember.mockImplementation(() => of(chat));
    const { executeResolver } = setup();
    const resolverArgs = createResolverArgs({ params: { profileId } });
    const result$ = executeResolver(...resolverArgs);
    const result = isObservable(result$) ? await firstValueFrom(result$) : await result$;
    expect(chatsMock.getChatByMember).toHaveBeenCalledExactlyOnceWith(profileId);
    expect(result).toBe(chat);
  });

  it('should throw if the `params` missing a `chatId` and a `profileId`', async () => {
    const { executeResolver } = setup();
    expect(() => executeResolver(...createResolverArgs({ params: {} }))).toThrowError(
      /missing .*chat ?id.*profile ?id/i,
    );
    expect(chatsMock.getChatByMember).toHaveBeenCalledTimes(0);
    expect(chatsMock.getChat).toHaveBeenCalledTimes(0);
  });
});
