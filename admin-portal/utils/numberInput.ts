/**
 * Utility function to handle number input focus behavior
 * When value is 0, select all text so user can type directly
 */
export const handleNumberInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
  const value = e.target.value;
  if (value === '0' || value === '0.00' || value === '0.0' || value === '0.000') {
    e.target.select();
  }
};
