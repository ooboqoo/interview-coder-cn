import { useState } from 'react'
import { Pointer, PointerOff, OctagonX, MessageCircle } from 'lucide-react'
import { useSolutionStore } from '@/lib/store/solution'
import { useShortcutsStore } from '@/lib/store/shortcuts'
import { useAppStore } from '@/lib/store/app'
import ShortcutRenderer from '@/components/ShortcutRenderer'
import { Button } from '@/components/ui/button'
import { Dialog, DialogTitle, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'

export function AppStatusBar() {
  const {
    isLoading: isReceivingSolution,
    setIsLoading,
    screenshotData,
    solutionChunks,
    draftScreenshots
  } = useSolutionStore()
  const { ignoreMouse } = useAppStore()
  const { shortcuts } = useShortcutsStore()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [questionInput, setQuestionInput] = useState('')

  const handleStop = () => {
    setIsLoading(false)
    void window.api.stopSolutionStream()
  }

  const handleFollowUpClick = () => {
    setIsDialogOpen(true)
  }

  const handleDialogClose = () => {
    setIsDialogOpen(false)
    setQuestionInput('')
  }

  const handleSubmitQuestion = async () => {
    if (!questionInput.trim()) return

    setIsLoading(true)
    setIsDialogOpen(false)
    const question = questionInput.trim()
    setQuestionInput('')

    try {
      await window.api.sendFollowUpQuestion(question)
    } catch (error) {
      console.error('Error sending follow-up question:', error)
      setIsLoading(false)
    }
  }

  // Check if there's an active conversation
  const hasActiveConversation = screenshotData && solutionChunks.length > 0

  return (
    <div className="absolute bottom-0 flex items-center justify-between w-full text-blue-100 bg-gray-600/10 px-4 pb-1">
      <div>
        {isReceivingSolution ? (
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-r-2 border-[currentColor]"></div>
            <span className="text-sm">正在生成...</span>
            <div className="fixed bottom-4 left-1/2 -translate-x-1/2 flex justify-center z-50 pointer-events-none">
              <Button
                variant="secondary"
                className="h-8 px-4 text-base shadow-lg pointer-events-auto"
                onClick={handleStop}
              >
                <OctagonX className="w-4 h-4" />
                停止生成
                <ShortcutRenderer
                  shortcut={shortcuts.stopSolutionStream.key}
                  className="inline-block border bg-transparent py-0 px-1"
                />
              </Button>
            </div>
          </div>
        ) : draftScreenshots.length > 0 ? (
          <div className="flex items-center gap-2 text-sm opacity-70 pointer-events-none">
            <ShortcutHint shortcut={shortcuts.sendDraftScreenshots.key} label="发送草稿" />
            <ShortcutHint shortcut={shortcuts.deleteLastDraftScreenshot.key} label="撤回一张" />
            <ShortcutHint shortcut={shortcuts.clearDraftScreenshots.key} label="清空草稿" />
          </div>
        ) : hasActiveConversation ? (
          <div className="flex items-center space-x-2 pointer-events-none opacity-50 text-sm gap-1">
            <span>
              <ShortcutRenderer
                shortcut={shortcuts.appendScreenshot.key}
                className="inline-block scale-75 text-xs border border-current bg-transparent py-0 px-1 ml-1"
              />
              追加截图
            </span>
            <span>
              <ShortcutRenderer
                shortcut={shortcuts.takeScreenshot.key}
                className="inline-block scale-75 text-xs border border-current bg-transparent py-0 px-1"
              />
              新开对话
            </span>
          </div>
        ) : null}
      </div>
      <div className="flex items-center space-x-4 select-none">
        {/* Follow-up Question Button */}
        {hasActiveConversation && !isReceivingSolution && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleFollowUpClick}
            className="h-7 px-3 text-xs"
            disabled={isReceivingSolution}
          >
            <MessageCircle className="w-4 h-4 mr-1" />
            追问问题
          </Button>
        )}
        {/* Mouse Status Indicator */}
        <div className="flex items-center">
          {ignoreMouse ? (
            <>
              <PointerOff className="w-4 h-4 mr-2" />
              <span className="text-xs">
                取消鼠标透传
                <ShortcutRenderer
                  shortcut={shortcuts.ignoreOrEnableMouse.key}
                  className="inline-block scale-75 text-xs border border-current bg-transparent py-0 px-1"
                />
              </span>
            </>
          ) : (
            <Pointer className="w-4 h-4" />
          )}
        </div>
      </div>

      {/* Follow-up Question Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTitle className="sr-only">追问问题</DialogTitle>
        <DialogContent>
          <div className="py-4">
            <Textarea
              placeholder="请输入追问内容，按 Ctrl+Enter 提交..."
              value={questionInput}
              className="min-h-24"
              onChange={(e) => setQuestionInput(e.target.value)}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault()
                  handleSubmitQuestion()
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleDialogClose}>
              取消
            </Button>
            <Button onClick={handleSubmitQuestion} disabled={!questionInput.trim()}>
              提交
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ShortcutHint({ shortcut, label }: { shortcut: string; label: string }) {
  return (
    <span>
      <ShortcutRenderer
        shortcut={shortcut}
        className="inline-block scale-75 text-xs border border-current bg-transparent py-0 px-1"
      />
      {label}
    </span>
  )
}
