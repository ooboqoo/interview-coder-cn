import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import {
  ArrowLeft,
  SquareTerminal,
  Palette,
  Shield,
  Bot,
  Eye,
  EyeOff,
  Keyboard,
  FolderOpen,
  FileCode,
  Mic,
  Plus,
  RotateCcw,
  X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import {
  useSettingsStore,
  PRESET_SCENE_PROMPTS,
  type ScreenshotDisplay,
  OPACITY_MIN,
  OPACITY_MAX,
  OPACITY_STEP
} from '@/lib/store/settings'
import type { Theme } from '@/lib/theme'
import { isMac } from '@/lib/utils/env'
import { ModelField } from './ModelField'
import { ApiProfiles } from './ApiProfiles'
import { SelectBaseURL } from './SelectBaseURL'
import { changeApiBaseURL } from '@/lib/model-switch'
import { CustomShortcuts, ResetDefaultShortcuts } from './CustomShortcuts'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'

export default function SettingsPage() {
  const {
    theme,
    opacity,
    resizable,
    showOverlayToolbar,
    hideShortcutHints,
    toolbarHoverDelay,
    screenshotDisplay,
    apiBaseURL,
    apiKey,
    scenes,
    activeSceneId,
    screenshotAutoSave,
    screenshotDir,
    codeAutoSave,
    codeSaveDir,
    codeCopyToClipboard,
    dashscopeApiKey,
    audioInputDeviceId,
    audioOutputDeviceId,
    hideDockIcon,
    updateSetting,
    setActiveScene,
    updateScenePrompt,
    addScene,
    removeScene
  } = useSettingsStore()
  const [showApiKey, setShowApiKey] = useState(false)
  const [showDashscopeApiKey, setShowDashscopeApiKey] = useState(false)
  const [addSceneOpen, setAddSceneOpen] = useState(false)
  const [newSceneName, setNewSceneName] = useState('')
  const [sceneToDelete, setSceneToDelete] = useState<string | null>(null)

  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([])

  const activeScene = scenes.find((s) => s.id === activeSceneId)
  const deletingScene = scenes.find((s) => s.id === sceneToDelete)

  useEffect(() => {
    return () => {
      document.body.style.opacity = ''
    }
  }, [])

  useEffect(() => {
    const loadDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices()
        const needsPermission = devices.every((d) => !d.label)
        if (needsPermission) {
          await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
        }
        const refreshed = await navigator.mediaDevices.enumerateDevices()
        setAudioDevices(refreshed)
      } catch (err) {
        console.error('Failed to enumerate audio devices:', err)
      }
    }
    loadDevices()
  }, [])

  const handleAddScene = () => {
    const name = newSceneName.trim()
    if (!name) return
    addScene(name)
    setNewSceneName('')
    setAddSceneOpen(false)
  }

  const handleResetScenePrompt = () => {
    if (!activeScene?.isPreset) return
    updateScenePrompt(activeScene.id, PRESET_SCENE_PROMPTS[activeScene.id] ?? '')
  }

  return (
    <>
      {/* Header */}
      <div id="app-header" className="flex items-center">
        <div className="actions">
          <Button variant="ghost" asChild size="icon" className="w-12 mr-2 rounded-none">
            <Link to="/">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
        </div>
        <h1>设置</h1>
      </div>

      {/* Settings Content */}
      <div id="app-content" className="flex flex-col gap-4 p-8">
        {/* AI Settings */}
        <div className="bg-gray-300/80 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <Bot className="h-5 w-5 mr-2" />
            AI 设置
          </h2>

          <div className="space-y-4">
            <ApiProfiles />

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">
                API Base URL
                <span className="ml-2 text-xs font-light">
                  可选常用平台，也可输入其他 OpenAI 兼容地址
                </span>
              </label>
              <SelectBaseURL value={apiBaseURL} onChange={changeApiBaseURL} />
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">API Key</label>
              <div className="flex items-center w-60">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => updateSetting('apiKey', e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="输入 API Key"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="border border-l-0 rounded-l-none rounded-r-md h-9 w-9 hover:border-none"
                >
                  {showApiKey ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <ModelField />
          </div>
        </div>
        {/* Transcription Settings */}
        <div className="bg-gray-300/80 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <Mic className="h-5 w-5 mr-2" />
            语音转录
          </h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">
                百炼平台 API Key
                <span className="ml-2 text-xs font-light">
                  从阿里云
                  <a
                    href="https://bailian.console.aliyun.com/cn-beijing?tab=model#/api-key"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-0.5 text-blue-700 hover:underline"
                  >
                    百炼平台
                  </a>
                  获取，如不需要语音转录功能可跳过
                </span>
              </label>
              <div className="flex items-center w-60">
                <input
                  type={showDashscopeApiKey ? 'text' : 'password'}
                  value={dashscopeApiKey}
                  onChange={(e) => updateSetting('dashscopeApiKey', e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="输入百炼平台 API Key"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowDashscopeApiKey(!showDashscopeApiKey)}
                  className="border border-l-0 rounded-l-none rounded-r-md h-9 w-9 hover:border-none"
                >
                  {showDashscopeApiKey ? (
                    <Eye className="h-4 w-4" />
                  ) : (
                    <EyeOff className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">
                音频输入设备
                <span className="ml-2 text-xs font-light">选择麦克风，留空则捕获系统音频</span>
              </label>
              <Select
                value={audioInputDeviceId || 'system'}
                onValueChange={(val) =>
                  updateSetting('audioInputDeviceId', val === 'system' ? '' : val)
                }
              >
                <SelectTrigger className="w-60 bg-white">
                  <SelectValue placeholder="系统音频（默认）" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="system">系统音频（默认）</SelectItem>
                  {audioDevices
                    .filter((d) => d.kind === 'audioinput')
                    .map((d) => (
                      <SelectItem key={d.deviceId} value={d.deviceId}>
                        {d.label || d.deviceId}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">
                音频输出设备
                <span className="ml-2 text-xs font-light">用于转录时的监听输出</span>
              </label>
              <Select
                value={audioOutputDeviceId || 'default'}
                onValueChange={(val) =>
                  updateSetting('audioOutputDeviceId', val === 'default' ? '' : val)
                }
              >
                <SelectTrigger className="w-60 bg-white">
                  <SelectValue placeholder="默认设备" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">默认设备</SelectItem>
                  {audioDevices
                    .filter((d) => d.kind === 'audiooutput')
                    .map((d) => (
                      <SelectItem key={d.deviceId} value={d.deviceId}>
                        {d.label || d.deviceId}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <div className="bg-gray-300/80 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <SquareTerminal className="h-5 w-5 mr-2" />
            解题设置
          </h2>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">
                使用场景
                <span className="ml-2 text-xs font-light">
                  选择场景后可编辑对应的系统提示词，修改会自动保存；也可新增自己的场景
                </span>
              </label>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                {scenes.map((scene) => (
                  <div
                    key={scene.id}
                    className={cn(
                      'group flex items-center rounded-full border text-sm transition-colors cursor-pointer select-none',
                      scene.id === activeSceneId
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'bg-white border-gray-300 hover:border-blue-400'
                    )}
                    onClick={() => setActiveScene(scene.id)}
                  >
                    <span className={cn('py-1 pl-3', scene.isPreset ? 'pr-3' : 'pr-1')}>
                      {scene.name}
                    </span>
                    {!scene.isPreset && (
                      <button
                        className="mr-1.5 p-0.5 rounded-full opacity-60 hover:opacity-100 hover:bg-black/10"
                        title="删除该场景"
                        onClick={(e) => {
                          e.stopPropagation()
                          setSceneToDelete(scene.id)
                        }}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  className="flex items-center gap-1 rounded-full border border-dashed border-gray-400 bg-transparent px-3 py-1 text-sm text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-colors"
                  onClick={() => setAddSceneOpen(true)}
                >
                  <Plus className="h-3.5 w-3.5" />
                  新增场景
                </button>
              </div>
            </div>

            {activeScene && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium">
                    系统提示词
                    <span className="ml-2 text-xs font-light">「{activeScene.name}」场景</span>
                  </label>
                  {activeScene.isPreset && (
                    <button
                      className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900 transition-colors"
                      title="恢复该场景的默认提示词"
                      onClick={handleResetScenePrompt}
                    >
                      <RotateCcw className="h-3 w-3" />
                      恢复默认
                    </button>
                  )}
                </div>
                <Textarea
                  value={activeScene.prompt}
                  onChange={(e) => updateScenePrompt(activeScene.id, e.target.value)}
                  placeholder="请输入该场景的系统提示词, 示例: 你是一个解题助手, 请根据「截图」和「语音转录内容」给出相关回答。"
                  className="w-full min-h-24 max-h-100 bg-white"
                  rows={6}
                />
              </div>
            )}
          </div>
        </div>

        {/* Add scene dialog */}
        <Dialog open={addSceneOpen} onOpenChange={setAddSceneOpen}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>新增场景</DialogTitle>
              <DialogDescription>创建后可为该场景编写专属的系统提示词</DialogDescription>
            </DialogHeader>
            <Input
              value={newSceneName}
              onChange={(e) => setNewSceneName(e.target.value)}
              placeholder="场景名称，如：数学考试"
              maxLength={20}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddScene()
              }}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddSceneOpen(false)}>
                取消
              </Button>
              <Button onClick={handleAddScene} disabled={!newSceneName.trim()}>
                创建
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete scene confirm dialog */}
        <Dialog open={!!sceneToDelete} onOpenChange={(open) => !open && setSceneToDelete(null)}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>删除场景</DialogTitle>
              <DialogDescription>
                确定删除场景「{deletingScene?.name}」吗？其提示词内容将一并删除，且无法恢复。
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSceneToDelete(null)}>
                取消
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (sceneToDelete) removeScene(sceneToDelete)
                  setSceneToDelete(null)
                }}
              >
                删除
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Appearance Settings */}
        <div className="bg-gray-300/80 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <Palette className="h-5 w-5 mr-2" />
            界面设置
          </h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">
                背景主题
                <span className="ml-2 text-xs font-light">
                  做题页面为白色背景时选「浅色」，工具会变为白底黑字，不再显眼
                </span>
              </label>
              <Select value={theme} onValueChange={(val) => updateSetting('theme', val as Theme)}>
                <SelectTrigger className="w-60 bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dark">深色（默认）</SelectItem>
                  <SelectItem value="light">浅色（白底黑字）</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">
                窗口透明度
                <span className="ml-2 text-xs font-light">
                  拖动可实时预览效果，也可在主界面用快捷键调节
                </span>
              </label>
              <div className="w-60 flex items-center gap-2">
                <span className="text-xs whitespace-nowrap">透明</span>
                <Slider
                  min={OPACITY_MIN}
                  max={OPACITY_MAX}
                  step={OPACITY_STEP}
                  value={[opacity]}
                  onValueChange={(value) => {
                    updateSetting('opacity', value[0])
                    document.body.style.opacity = value[0].toString()
                  }}
                />
                <span className="text-xs whitespace-nowrap">不透明</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">
                允许调整主窗口大小
                <span className="ml-2 text-xs font-light">
                  关闭后鼠标移到窗口边缘不再出现缩放光标
                </span>
              </label>
              <Switch
                className="scale-y-90"
                checked={resizable}
                onCheckedChange={(checked) => updateSetting('resizable', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">
                截图展示方式
                <span className="ml-2 text-xs font-light">
                  主界面上截图占多大位置；无论选哪种，截图都会正常发送给 AI
                </span>
              </label>
              <Select
                value={screenshotDisplay}
                onValueChange={(val) =>
                  updateSetting('screenshotDisplay', val as ScreenshotDisplay)
                }
              >
                <SelectTrigger className="w-60 bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">不展示</SelectItem>
                  <SelectItem value="count">卡片显示截图数量</SelectItem>
                  <SelectItem value="gallery">显示全部缩略图（默认）</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">
                隐藏快捷键提醒
                <span className="ml-2 text-xs font-light">
                  开启后，主界面底部不再显示「追加截图」「新开对话」的快捷键提示
                </span>
              </label>
              <Switch
                className="scale-y-90"
                checked={hideShortcutHints}
                onCheckedChange={(checked) => updateSetting('hideShortcutHints', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">
                悬浮工具条
                <span className="ml-2 text-xs font-light">
                  在主窗口上方显示一排按钮，可用鼠标点击替代快捷键操作，详见帮助中心
                </span>
              </label>
              <Switch
                className="scale-y-90"
                checked={showOverlayToolbar}
                onCheckedChange={(checked) => updateSetting('showOverlayToolbar', checked)}
              />
            </div>

            {showOverlayToolbar && (
              <div className="flex items-center justify-between pl-4 border-l-2 border-gray-400/70">
                <label className="text-sm font-medium">
                  悬停触发
                  <span className="ml-2 text-xs font-light">
                    鼠标在按钮上停留指定时间即触发，无需点击；停留过程中按钮下方有进度条
                  </span>
                </label>
                <Select
                  value={String(toolbarHoverDelay)}
                  onValueChange={(val) => updateSetting('toolbarHoverDelay', Number(val))}
                >
                  <SelectTrigger className="w-60 bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">关闭（仅点击触发）</SelectItem>
                    <SelectItem value="500">停留 0.5 秒</SelectItem>
                    <SelectItem value="1000">停留 1 秒</SelectItem>
                    <SelectItem value="2000">停留 2 秒</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>

        {/* Shortcuts Settings */}
        <div className="bg-gray-300/80 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <Keyboard className="h-5 w-5 mr-2" />
            快捷键设置
            <div className="text-sm font-light ml-2 mt-1">
              只有在主界面时，快捷键才有效。当前页面仅部分快捷键生效。
            </div>
            <ResetDefaultShortcuts />
          </h2>
          <CustomShortcuts />
        </div>

        {/* Screenshot Save Settings */}
        <div className="bg-gray-300/80 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <FolderOpen className="h-5 w-5 mr-2" />
            保存截图
          </h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">
                保存截图到本地
                <span className="ml-2 text-xs font-light">
                  开启后，每次截图都会自动保存到指定目录
                </span>
              </label>
              <Switch
                className="scale-y-90"
                checked={screenshotAutoSave}
                onCheckedChange={(checked) => updateSetting('screenshotAutoSave', checked)}
              />
            </div>
            {screenshotAutoSave && (
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">
                  保存目录
                  <span className="ml-2 text-xs font-light">
                    可点击右侧内容重新选择保存目录（选择弹窗可能被本窗口遮挡）
                  </span>
                </label>
                <button
                  className="text-xs text-gray-600 max-w-48 truncate hover:text-gray-900 cursor-pointer transition-colors"
                  title="点击选择保存目录"
                  onClick={async () => {
                    const dir = await window.api.selectScreenshotDir()
                    if (dir) updateSetting('screenshotDir', dir)
                  }}
                >
                  {screenshotDir || '默认: 图片/InterviewCoder'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Generated Code Save Settings */}
        <div className="bg-gray-300/80 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <FileCode className="h-5 w-5 mr-2" />
            算法题保存到本地
          </h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">
                保存代码到本地
                <span className="ml-2 text-xs font-light">
                  开启后，解答里包含代码时会按语言自动保存为源文件
                </span>
              </label>
              <Switch
                className="scale-y-90"
                checked={codeAutoSave}
                onCheckedChange={(checked) => updateSetting('codeAutoSave', checked)}
              />
            </div>
            {codeAutoSave && (
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">
                  保存目录
                  <span className="ml-2 text-xs font-light">
                    文件依次命名为 Test1.java、Test2.py
                    等，重名自动往后排（选择弹窗可能被本窗口遮挡）
                  </span>
                </label>
                <button
                  className="text-xs text-gray-600 max-w-48 truncate hover:text-gray-900 cursor-pointer transition-colors"
                  title="点击选择保存目录"
                  onClick={async () => {
                    const dir = await window.api.selectCodeDir()
                    if (dir) updateSetting('codeSaveDir', dir)
                  }}
                >
                  {codeSaveDir || '未选择目录（未选择时不会保存）'}
                </button>
              </div>
            )}

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">
                保存到剪贴板
                <span className="ml-2 text-xs font-light">
                  开启后，解答里的代码会自动复制到剪贴板，可直接粘贴到编辑器
                </span>
              </label>
              <Switch
                className="scale-y-90"
                checked={codeCopyToClipboard}
                onCheckedChange={(checked) => updateSetting('codeCopyToClipboard', checked)}
              />
            </div>
          </div>
        </div>

        {/* Privacy Settings */}
        <div className="bg-gray-300/80 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <Shield className="h-5 w-5 mr-2" />
            隐私设置
          </h2>

          <div className="space-y-4">
            <p className="text-sm">
              此应用为本地应用，采集的图片直接上传到您配置的 OpenAI
              等大模型公司，不存在隐私泄露风险。
            </p>
            {isMac && (
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">
                  隐藏 Dock 图标
                  <span className="ml-2 text-xs font-light">
                    开启后不在程序坞和 Cmd+Tab 切换器中显示，仅可通过快捷键唤起窗口
                  </span>
                </label>
                <Switch
                  className="scale-y-90"
                  checked={hideDockIcon}
                  onCheckedChange={(checked) => updateSetting('hideDockIcon', checked)}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
