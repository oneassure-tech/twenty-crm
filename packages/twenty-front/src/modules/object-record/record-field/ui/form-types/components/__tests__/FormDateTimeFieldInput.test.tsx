import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createStore, Provider as JotaiProvider } from 'jotai';
import { useState } from 'react';

import { FormDateTimeFieldInput } from '@/object-record/record-field/ui/form-types/components/FormDateTimeFieldInput';

// Mirrors how a form feeds each change back in as the new value, and lets the
// test re-render the parent without changing that value - which is what a
// polling query or any other parent update does while someone is typing.
const renderControlledInput = (initialValue: string | null) => {
  const onChange = jest.fn();
  let rerenderParent: () => void = () => {};

  const Harness = () => {
    const [value, setValue] = useState<string | null>(initialValue);
    const [, setRenderCount] = useState(0);

    rerenderParent = () => setRenderCount((renderCount) => renderCount + 1);

    return (
      <FormDateTimeFieldInput
        defaultValue={value ?? undefined}
        timeZone="UTC"
        onChange={(newValue) => {
          onChange(newValue);
          setValue(newValue);
        }}
      />
    );
  };

  render(
    <JotaiProvider store={createStore()}>
      <Harness />
    </JotaiProvider>,
  );

  return { onChange, rerenderParent: () => act(async () => rerenderParent()) };
};

const openPickerTimeInput = async (
  user: ReturnType<typeof userEvent.setup>,
) => {
  await user.click(screen.getAllByRole('textbox')[0]);

  const timeInput = (screen.getAllByRole('textbox') as HTMLInputElement[]).find(
    (textbox) => /^\d\d:\d\d/.test(textbox.value),
  );

  if (timeInput === undefined) {
    throw new Error('The picker time input did not open');
  }

  await user.click(timeInput);
  timeInput.setSelectionRange(0, timeInput.value.length);

  return timeInput;
};

describe('FormDateTimeFieldInput', () => {
  it('should keep a half-typed time when the parent re-renders', async () => {
    const user = userEvent.setup();
    const { rerenderParent } = renderControlledInput('2026-09-15T11:06:00Z');

    const timeInput = await openPickerTimeInput(user);
    await user.keyboard('09');

    expect(timeInput.value).toBe('09:__ __');

    await rerenderParent();

    expect(timeInput.value).toBe('09:__ __');
  });

  it('should keep a half-typed time on an empty field when the parent re-renders', async () => {
    const user = userEvent.setup();
    const { rerenderParent } = renderControlledInput(null);

    const timeInput = await openPickerTimeInput(user);
    await user.keyboard('09');

    await rerenderParent();

    expect(timeInput.value).toBe('09:__ __');
  });

  it('should save the new time once it is fully typed', async () => {
    const user = userEvent.setup();
    const { onChange } = renderControlledInput('2026-09-15T11:06:00Z');

    await openPickerTimeInput(user);
    await user.keyboard('0945PM');

    expect(onChange).toHaveBeenLastCalledWith('2026-09-15T21:45:00Z');
  });
});
