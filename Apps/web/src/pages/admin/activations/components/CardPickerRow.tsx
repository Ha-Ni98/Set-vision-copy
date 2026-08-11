import { memo } from "react";
import { Checkbox } from "@/components/ui/checkbox";

interface Props {
  id: string;
  cardKey: string;
  setId: string;
  setNumber: string;
  checked: boolean;
  onToggle: (id: string, cardKey: string, setId: string, setNumber: string) => void;
}

function CardPickerRowImpl({ id, cardKey, setId, setNumber, checked, onToggle }: Props) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent">
      <Checkbox checked={checked} onCheckedChange={() => onToggle(id, cardKey, setId, setNumber)} />
      <span className="font-mono">{cardKey}</span>
    </label>
  );
}

// Memoized: a picker can have a group with up to ~1000 rows mounted at once (set-8-plan §6.2
// item 4). `onToggle` is a single stable callback owned by CardPicker (built off setSelected's
// functional-update form, never closing over the current selection), so toggling one card
// re-renders only that card's row instead of every row in the group.
export const CardPickerRow = memo(CardPickerRowImpl);
