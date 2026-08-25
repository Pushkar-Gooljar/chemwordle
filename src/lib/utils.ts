import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** shadcn/ui's class merger. Tailwind-aware, so later classes win properly. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
