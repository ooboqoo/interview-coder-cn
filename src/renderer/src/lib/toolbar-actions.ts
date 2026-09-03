import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Camera,
  ChevronDown,
  ChevronUp,
  CircleStop,
  ImagePlus,
  Mic,
  MousePointer2,
  Send,
  Sun,
  SunDim,
  type LucideIcon
} from 'lucide-react'

/** Action names the main process accepts from a toolbar click */
export type ToolbarActionName = Parameters<Window['api']['triggerAction']>[0]

export type ToolbarAction = {
  /** Also the shortcut action name, so the same key binding can be shown in help */
  action: ToolbarActionName
  Icon: LucideIcon
  label: string
}

/**
 * Buttons of the overlay toolbar, in display order. Drives both the toolbar
 * itself and its description on the help page, so the two never drift apart.
 * `hideOrShowMainWindow` is intentionally absent: hiding the window also hides
 * the toolbar, leaving no way to click the window back.
 */
export const TOOLBAR_ACTIONS: ToolbarAction[] = [
  { action: 'takeScreenshot', Icon: Camera, label: '截图解题（新开对话）' },
  { action: 'appendScreenshot', Icon: ImagePlus, label: '追加截图到待发送队列' },
  { action: 'sendDraftScreenshots', Icon: Send, label: '发送待发送截图' },
  { action: 'stopSolutionStream', Icon: CircleStop, label: '停止生成' },
  { action: 'ignoreOrEnableMouse', Icon: MousePointer2, label: '切换鼠标穿透' },
  { action: 'pageUp', Icon: ChevronUp, label: '向上翻页' },
  { action: 'pageDown', Icon: ChevronDown, label: '向下翻页' },
  { action: 'moveMainWindowUp', Icon: ArrowUp, label: '向上移动窗口' },
  { action: 'moveMainWindowLeft', Icon: ArrowLeft, label: '向左移动窗口' },
  { action: 'moveMainWindowDown', Icon: ArrowDown, label: '向下移动窗口' },
  { action: 'moveMainWindowRight', Icon: ArrowRight, label: '向右移动窗口' },
  { action: 'increaseOpacity', Icon: Sun, label: '提高不透明度（更清晰）' },
  { action: 'decreaseOpacity', Icon: SunDim, label: '提高透明度（更透明）' },
  { action: 'toggleTranscription', Icon: Mic, label: '开始/暂停语音转录' }
]
