import React, { useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface Props {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  id?: string;
}

/**
 * A searchable single-select — the "type to find your country" pattern, built
 * from shadcn's Popover + Command (cmdk) rather than the native `<select>`,
 * since a native dropdown has no search box and scrolling to a name near the
 * end of a 120-item list is exactly the friction this exists to remove.
 */
export const SearchableSelect: React.FC<Props> = ({
  options,
  value,
  onChange,
  placeholder = 'Select…',
  searchPlaceholder = 'Search…',
  emptyText = 'No match found.',
  id,
}) => {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('w-full justify-between font-normal', !value && 'text-muted-foreground')}
        >
          <span className="truncate text-left">{value || placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command
          filter={(option, search) => {
            // Substring match anywhere in the name, not cmdk's default fuzzy
            // scoring — a school's official name is long, and a student
            // typing an abbreviation (e.g. "rcc" for one specific college) or
            // just the town name expects a plain "contains" match, not a
            // fuzzy ranking that can bury the obvious result.
            return option.toLowerCase().includes(search.toLowerCase()) ? 1 : 0;
          }}
        >
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option}
                  value={option}
                  onSelect={(selected) => {
                    // cmdk lowercases the value it hands back to onSelect;
                    // resolve to the original-cased option rather than trust
                    // `selected` directly, or the stored value silently loses
                    // its casing.
                    const match = options.find((o) => o.toLowerCase() === selected.toLowerCase());
                    onChange(match ?? selected);
                    setOpen(false);
                  }}
                >
                  <Check className={cn('mr-2 h-4 w-4', value === option ? 'opacity-100' : 'opacity-0')} />
                  <span className="truncate">{option}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
