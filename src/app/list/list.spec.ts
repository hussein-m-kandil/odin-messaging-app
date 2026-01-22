import { render, RenderComponentOptions, screen } from '@testing-library/angular';
import { Component } from '@angular/core';
import { ListStore } from './list-store';
import { List } from './list';

interface TestData {
  id: number;
  name: string;
}

const consumerText = 'List consumer double';
const singularLabel = 'X';
const pluralLabel = 'Xs';
const listStoreMock = {
  list: vi.fn(() => [] as TestData[]),
  loadError: vi.fn(),
  loading: vi.fn(),
  hasMore: vi.fn(),
};

@Component({
  imports: [List],
  template: `
    <ng-template #li let-_foo>
      <p>{{ text }}</p>
      <div>{{ _foo.name }}</div>
    </ng-template>
    <app-list
      [itemFragment]="li"
      [store]="listStore"
      [singularLabel]="singularLabel"
      [pluralLabel]="pluralLabel"
    />
  `,
})
class ListConsumerDouble {
  text = consumerText;
  pluralLabel = pluralLabel;
  singularLabel = singularLabel;
  listStore = listStoreMock as unknown as ListStore<TestData>;
}

const renderComponent = (options: RenderComponentOptions<ListConsumerDouble> = {}) => {
  return render(ListConsumerDouble, options);
};

describe('List', () => {
  afterEach(vi.resetAllMocks);

  it('should render an empty-list message', async () => {
    await renderComponent();
    expect(screen.getByText(`There are no ${pluralLabel.toLowerCase()}.`)).toBeVisible();
    expect(screen.queryByRole('menu', { name: `${singularLabel} list` })).toBeNull();
    expect(screen.queryByText(consumerText)).toBeNull();
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('should render a list of items', async () => {
    const list = [
      { id: 1, name: 'Foo' },
      { id: 2, name: 'Bar' },
      { id: 3, name: 'Tar' },
    ];
    listStoreMock.list.mockImplementation(() => list);
    await renderComponent();
    expect(screen.queryByText(`There are no ${pluralLabel.toLowerCase()}.`)).toBeNull();
    expect(screen.getByRole('list', { name: `${singularLabel} list` })).toBeVisible();
    expect(screen.getAllByText(consumerText)).toHaveLength(list.length);
    expect(screen.getAllByRole('listitem')).toHaveLength(list.length);
    expect(screen.getByRole('list')).toBeVisible();
    for (const { name } of list) {
      expect(screen.getByText(name)).toBeVisible();
    }
  });
});
