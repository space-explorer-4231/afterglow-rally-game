/** Keep focused HTML controls in charge of their own keyboard activation/editing. */
export function preserveNativeMenuKey(tagName: string, code: string, inputType = ''): boolean {
  if (code !== 'Escape' && code !== 'Backspace') {
    if (tagName === 'SELECT') return true;
    if (tagName === 'INPUT' && inputType === 'range') return true;
  }
  if (code !== 'Enter' && code !== 'Space') return false;
  return tagName === 'BUTTON' || tagName === 'A' || tagName === 'SUMMARY' || tagName === 'INPUT';
}
