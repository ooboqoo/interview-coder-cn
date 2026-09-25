import { useEffect, useRef, useState } from 'react'
import { Check, Copy, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { useSettingsStore } from '@/lib/store/settings'

/**
 * The list of saved AI endpoints: pick the active one, add, copy, rename or
 * remove. Each entry holds its own URL / key / model, so switching profiles
 * does not disturb the others.
 */
export function ApiProfiles() {
  const { apiProfiles, activeProfileId, apiKey, apiBaseURL, setActiveProfile, addProfile } =
    useSettingsStore()
  const [addOpen, setAddOpen] = useState(false)
  const [newName, setNewName] = useState('')

  const handleAdd = (copyActive: boolean) => {
    const trimmed = newName.trim()
    const fallback = `配置${apiProfiles.length + 1}`
    addProfile(trimmed || fallback, copyActive)
    setNewName('')
    setAddOpen(false)
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">
          当前配置
          <span className="ml-2 text-xs font-light">
            每个配置保存一组 API 地址、密钥和模型，切换时可分别使用
          </span>
        </label>
        <div className="flex items-center gap-1">
          <Select value={activeProfileId} onValueChange={setActiveProfile}>
            <SelectTrigger className="w-52 bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {apiProfiles.map((profile) => (
                <SelectItem key={profile.id} value={profile.id}>
                  {profile.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="icon"
            className="size-9 shrink-0"
            title="添加配置"
            onClick={() => setAddOpen(true)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ProfileList />

      <SaveStatus apiKey={apiKey} apiBaseURL={apiBaseURL} activeProfileId={activeProfileId} />

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加配置</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="配置名称，如「DeepSeek 主力」（留空则自动命名）"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleAdd(false)
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => handleAdd(true)}>
              <Copy className="h-4 w-4 mr-1" />
              复制当前配置
            </Button>
            <Button onClick={() => handleAdd(false)}>新建空白配置</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

/**
 * Edits are saved the moment they are typed, so there is no button to press.
 * This reports that back instead: while a field is changing it reads 「保存中」,
 * and once typing stops it confirms 「已保存」 for a moment. Without it the
 * silence is indistinguishable from a failed save.
 */
function SaveStatus({
  apiKey,
  apiBaseURL,
  activeProfileId
}: {
  apiKey: string
  apiBaseURL: string
  activeProfileId: string
}) {
  const [state, setState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const firstRun = useRef(true)

  useEffect(() => {
    // Nothing has been edited yet, so there is nothing to report
    if (firstRun.current) {
      firstRun.current = false
      return
    }
    setState('saving')
    const saving = setTimeout(() => setState('saved'), 400)
    // The confirmation is a reaction to an edit, not a permanent label
    const done = setTimeout(() => setState('idle'), 2400)
    return () => {
      clearTimeout(saving)
      clearTimeout(done)
    }
    // Switching profiles re-reads the fields and counts as a change too
  }, [apiKey, apiBaseURL, activeProfileId])

  if (state === 'idle') return null

  return (
    <div className="flex items-center gap-1 text-xs">
      {state === 'saving' ? (
        <span className="text-gray-400">保存中…</span>
      ) : (
        <span className="flex items-center gap-1 text-green-700">
          <Check className="h-3.5 w-3.5" />
          已保存
        </span>
      )}
    </div>
  )
}

/** Rename and delete controls for the profiles, shown as a compact list */
function ProfileList() {
  const { apiProfiles, activeProfileId, renameProfile, removeProfile, setActiveProfile } =
    useSettingsStore()
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [draftName, setDraftName] = useState('')

  const commitRename = () => {
    if (renamingId) {
      const trimmed = draftName.trim()
      if (trimmed) renameProfile(renamingId, trimmed)
    }
    setRenamingId(null)
  }

  return (
    <div className="space-y-1.5 pl-4 border-l-2 border-gray-400/70">
      {apiProfiles.map((profile) => {
        const isActive = profile.id === activeProfileId
        return (
          <div key={profile.id} className="flex items-center gap-2 text-xs">
            <button
              className={cn(
                'flex items-center gap-1.5 min-w-0 cursor-pointer transition-colors',
                isActive ? 'text-gray-900' : 'text-gray-500 hover:text-gray-800'
              )}
              onClick={() => setActiveProfile(profile.id)}
              title="点击切换到该配置"
            >
              <Check
                className={cn('h-3.5 w-3.5 shrink-0', isActive ? 'opacity-100' : 'opacity-0')}
              />
              {renamingId === profile.id ? (
                <Input
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitRename()
                    if (e.key === 'Escape') setRenamingId(null)
                  }}
                  className="h-6 w-32 px-1.5 py-0 text-xs"
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span className="truncate max-w-36">{profile.name}</span>
              )}
            </button>
            <span className="truncate text-gray-400 max-w-48">{profile.model || '未设置模型'}</span>
            {renamingId !== profile.id && (
              <button
                className="shrink-0 text-gray-400 hover:text-gray-800 cursor-pointer"
                title="重命名"
                onClick={() => {
                  setRenamingId(profile.id)
                  setDraftName(profile.name)
                }}
              >
                重命名
              </button>
            )}
            <button
              className={cn(
                'shrink-0 cursor-pointer transition-colors',
                apiProfiles.length <= 1
                  ? 'text-gray-300 cursor-not-allowed'
                  : 'text-gray-400 hover:text-red-600'
              )}
              title={apiProfiles.length <= 1 ? '至少保留一个配置' : '删除该配置'}
              disabled={apiProfiles.length <= 1}
              onClick={() => removeProfile(profile.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
