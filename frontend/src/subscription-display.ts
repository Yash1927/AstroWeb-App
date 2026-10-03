export function formatCallsLeft(count: number) {
  return `${count} ${count === 1 ? 'call' : 'calls'} left`
}
