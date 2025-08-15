// This file re-exports SimplePickupDateSelector as PickupDateSelector
// to maintain compatibility with existing code without importing date-fns
import { SimplePickupDateSelector } from "./SimplePickupDateSelector";

// Re-export with the original name to maintain compatibility
export const PickupDateSelector = SimplePickupDateSelector;

// Re-export the interface as well
export type { SimplePickupDateSelectorProps as PickupDateSelectorProps } from "./SimplePickupDateSelector"; 