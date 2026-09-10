export function createDatePickerField(
  value: string | undefined,
  id?: string
): { el: HTMLElement; getValue: () => string; setValue: (v: string) => void; clear: () => void } {
  const wrap = document.createElement('div');
  wrap.className = 'date-picker';

  const input = document.createElement('input');
  input.type = 'date';
  input.className = 'date-picker__input';
  if (id) input.id = id;
  if (value) input.value = value;

  const pickBtn = document.createElement('button');
  pickBtn.type = 'button';
  pickBtn.className = 'date-picker__btn';
  pickBtn.title = 'Open calendar';
  pickBtn.setAttribute('aria-label', 'Open calendar');
  pickBtn.textContent = '📅';
  pickBtn.addEventListener('click', (e) => {
    e.preventDefault();
    input.showPicker?.();
    input.focus();
  });

  const clearBtn = document.createElement('button');
  clearBtn.type = 'button';
  clearBtn.className = 'btn btn--ghost btn--sm date-picker__clear';
  clearBtn.textContent = 'Clear';
  clearBtn.addEventListener('click', () => {
    input.value = '';
  });

  wrap.append(input, pickBtn, clearBtn);

  return {
    el: wrap,
    getValue: () => input.value,
    setValue: (v: string) => {
      input.value = v;
    },
    clear: () => {
      input.value = '';
    },
  };
}
