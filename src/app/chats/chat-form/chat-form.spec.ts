import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChatForm } from './chat-form';

describe('ChatForm', () => {
  let component: ChatForm;
  let fixture: ComponentFixture<ChatForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChatForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ChatForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
