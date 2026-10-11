const green = '\x1b[32m'
const yellow = '\x1b[33m'
const blue = '\x1b[34m'
const cyan = '\x1b[36m'
const white = '\x1b[37m'
const bgRed = '\x1b[41m'
const reset = '\x1b[0m'

const role = (label: string, color: string) => `${color}${label.toUpperCase()}:${reset}`

export const log = {
  user: (msg: string) => console.log(`${role('user', green)} ${white}${msg}${reset}`),
  assistant: (content: unknown) => console.log(`${role('assistant', yellow)} ${white}${content}${reset}`),
  interrupt: (actions: string[]) =>
    console.warn(`${white}${bgRed}[interrupt]${reset} ${white}### Interrupted (${actions.join(', ')})${reset}`),
  decision: (decisions: { type: string; name?: string }[]) =>
    console.log(`${role('decision', cyan)} ${white}${decisions.map(d => `${d.name ?? ''}:${d.type}`).join(', ')}${reset}`),
  invoke: (content: unknown) =>
    console.log(`${role('invoke', blue)} ${white}${content}${reset}`),
}

export type Log = typeof log
