import { render, RenderComponentOptions, screen } from '@testing-library/angular';
import { userEvent } from '@testing-library/user-event';
import { Component, input, output } from '@angular/core';
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
    @if (searchable(); as _searchable) {
      <app-list
        [itemFragment]="li"
        [store]="listStore"
        [pluralLabel]="pluralLabel"
        [singularLabel]="singularLabel"
        (searched)="searched.emit($event)"
        [searchValue]="searchValue()"
        [searchable]="_searchable"
      />
    } @else {
      <app-list
        [itemFragment]="li"
        [store]="listStore"
        [singularLabel]="singularLabel"
        [pluralLabel]="pluralLabel"
      />
    }
  `,
})
class ListConsumerDouble {
  text = consumerText;
  pluralLabel = pluralLabel;
  singularLabel = singularLabel;
  listStore = listStoreMock as unknown as ListStore<TestData>;
  searchable = input<boolean | string>();
  searched = output<string>();
  searchValue = input('');
}

const renderComponent = (options: RenderComponentOptions<ListConsumerDouble> = {}) => {
  return render(ListConsumerDouble, { autoDetectChanges: false, ...options });
};

describe('List', () => {
  afterEach(vi.resetAllMocks);

  it('should not render a search box', async () => {
    await renderComponent();
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('should render an empty search box without a clear button', async () => {
    await renderComponent({ inputs: { searchable: true } });
    const searchbox = screen.getByRole('textbox');
    expect(searchbox).toBeVisible();
    expect(searchbox).toHaveValue('');
    expect(searchbox).toHaveAccessibleName('Search');
    expect(searchbox).toHaveAttribute('placeholder', 'Search');
    expect(screen.queryByRole('button', { name: /clear search/i })).toBeNull();
  });

  it('should render a search box with the given value, and a clear button', async () => {
    const searchValue = 'test search';
    await renderComponent({ inputs: { searchable: true, searchValue } });
    const searchbox = screen.getByRole('textbox');
    expect(searchbox).toBeVisible();
    expect(searchbox).toHaveValue(searchValue);
    expect(searchbox).toHaveAccessibleName('Search');
    expect(searchbox).toHaveAttribute('placeholder', 'Search');
    expect(screen.getByRole('button', { name: /clear search/i })).toBeVisible();
  });

  it('should clear the search box when clicking the clear button', async () => {
    const actor = userEvent.setup();
    const searchValue = 'test search';
    await renderComponent({ inputs: { searchable: true, searchValue } });
    const searchbox = screen.getByRole('textbox');
    expect(searchbox).toBeVisible();
    expect(searchbox).toHaveValue(searchValue);
    await actor.click(screen.getByRole('button', { name: /clear/i }));
    expect(searchbox).toBeVisible();
    expect(searchbox).toHaveValue('');
    expect(screen.queryByRole('button', { name: /clear/i })).toBeNull();
  });

  it('should emit the inputted search value on every keystroke', async () => {
    const actor = userEvent.setup();
    const searchValue = 'test search';
    const searchHandler = vi.fn();
    await renderComponent({ inputs: { searchable: true }, on: { searched: searchHandler } });
    const searchbox = screen.getByRole('textbox');
    await actor.type(searchbox, searchValue);
    expect(searchHandler).toHaveBeenCalledTimes(searchValue.length);
    for (let i = 0; i < searchValue.length; i++) {
      const n = i + 1;
      expect(searchHandler).toHaveBeenNthCalledWith(n, searchValue.slice(0, n));
    }
  });

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
