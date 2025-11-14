import { isMac } from './env'

const supportedPhysicalKeys = [
  // A~Z
  'KeyA',
  'KeyB',
  'KeyC',
  'KeyD',
  'KeyE',
  'KeyF',
  'KeyG',
  'KeyH',
  'KeyI',
  'KeyJ',
  'KeyK',
  'KeyL',
  'KeyM',
  'KeyN',
  'KeyO',
  'KeyP',
  'KeyQ',
  'KeyR',
  'KeyS',
  'KeyT',
  'KeyU',
  'KeyV',
  'KeyW',
  'KeyX',
  'KeyY',
  'KeyZ',
  // 0~9
  'Digit0',
  'Digit1',
  'Digit2',
  'Digit3',
  'Digit4',
  'Digit5',
  'Digit6',
  'Digit7',
  'Digit8',
  'Digit9',
  // F1~F12
  'F1',
  'F2',
  'F3',
  'F4',
  'F5',
  'F6',
  'F7',
  'F8',
  'F9',
  'F10',
  'F11',
  'F12',
  // Arrow keys
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  // Space, Tab, Enter, Backspace, Escape
  'Enter',
  'Tab',
  'Space',
  'Backspace',
  'Escape',
  // Backquote, Minus, Equal, Backslash, BracketLeft, BracketRight, Semicolon, Quote, Comma, Period, Slash
  'Backquote',
  'Minus',
  'Equal',
  'Backslash',
  'BracketLeft',
  'BracketRight',
  'Semicolon',
  'Quote',
  'Comma',
  'Period',
  'Slash'
] as const
type SupportPhysicalKey = (typeof supportedPhysicalKeys)[number]

const modifierKeys = [
  'ShiftLeft',
  'ShiftRight',
  'ControlLeft',
  'ControlRight',
  'AltLeft',
  'AltRight',
  'MetaLeft',
  'MetaRight'
]

export function isModifierKey(code: string) {
  return modifierKeys.includes(code)
}

export function getShortcutAccelerator(event: KeyboardEvent) {
  const keyCode = event.code
  if (isModifierKey(keyCode) || !supportedPhysicalKeys.includes(keyCode as SupportPhysicalKey)) {
    return null
  }

  const modifiers: string[] = []
  // AltRight on Windows reports AltGraph and toggles ctrlKey, so treat it as plain Alt
  const isAltGraph =
    typeof event.getModifierState === 'function' && event.getModifierState('AltGraph')
  const isCtrlActive = event.ctrlKey && !isAltGraph
  const isAltActive = event.altKey || isAltGraph

  if (isCtrlActive) modifiers.push(isMac ? 'Control' : 'CommandOrControl')
  if (isAltActive) modifiers.push('Alt')
  if (event.shiftKey) modifiers.push('Shift')
  if (event.metaKey) modifiers.push(isMac ? 'CommandOrControl' : 'Meta')
  if (modifiers.length === 0) return null

  const specialKeysMap = {
    ArrowUp: 'Up',
    ArrowDown: 'Down',
    ArrowLeft: 'Left',
    ArrowRight: 'Right',
    // Backquote, Minus, Equal, Backslash, BracketLeft, BracketRight, Semicolon, Quote, Comma, Period, Slash
    Backquote: '`',
    Minus: '-',
    Equal: '=',
    Backslash: '\\',
    BracketLeft: '[',
    BracketRight: ']',
    Semicolon: ';',
    Quote: "'",
    Comma: ',',
    Period: '.',
    Slash: '/'
  } as const

  let key = keyCode
  if (keyCode.startsWith('Key')) {
    key = keyCode.slice(3)
  }
  if (keyCode.startsWith('Digit')) {
    key = keyCode.slice(5)
  }
  if (keyCode in specialKeysMap) {
    key = specialKeysMap[keyCode as keyof typeof specialKeysMap]
  }
  return `${modifiers.join('+')}+${key}`
}

export function getShortcutAcceleratorDisplay(accelerator: string) {
  const modifiers: string[] = []
  if (accelerator.startsWith('Control')) modifiers.push('⌃')
  if (accelerator.includes('CommandOrControl')) modifiers.push(isMac ? '⌘' : 'Ctrl')
  if (accelerator.includes('Alt')) modifiers.push(isMac ? '⌥' : 'Alt')
  if (accelerator.includes('Shift')) modifiers.push(isMac ? '⇧' : 'Shift')
  if (accelerator.includes('Meta')) modifiers.push('Meta')

  const specialKeysMap = {
    Up: '↑',
    Down: '↓',
    Left: '←',
    Right: '→',
    Enter: '↵'
  } as const
  const key = accelerator.split('+').at(-1)!

  return `${modifiers.join('+')}+${key in specialKeysMap ? specialKeysMap[key] : key}`
}
