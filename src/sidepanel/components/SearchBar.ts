export function createSearchBar(onSearch: (q: string) => void): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'search-bar';

  const input = document.createElement('input');
  input.type = 'search';
  input.className = 'search-bar__input';
  input.placeholder = 'Search tasks…';
  input.addEventListener('input', () => onSearch(input.value));

  wrap.appendChild(input);
  return wrap;
}
