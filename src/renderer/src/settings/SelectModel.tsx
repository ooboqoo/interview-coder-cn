import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ChevronsUpDown, Check, Plus, X } from 'lucide-react'
import { useSettingsStore } from '@/lib/store/settings'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from '@/components/ui/command'

const defaultModels = [
  { value: 'Qwen/Qwen3-VL-32B-Instruct', label: 'Qwen/Qwen3-VL-32B-Instruct' },
  { value: 'Qwen/Qwen3-VL-8B-Thinking', label: 'Qwen/Qwen3-VL-8B-Thinking' },
  { value: 'zai-org/GLM-4.6V', label: 'zai-org/GLM-4.6V' },
  { value: 'gpt-5-mini', label: 'gpt-5-mini' },
  { value: 'gpt-5.1-codex', label: 'gpt-5.1-codex' },
  { value: 'gpt-5.2', label: 'gpt-5.2' }
]

export function SelectModel({
  value,
  onChange,
  disabled,
  className
}: {
  value?: string
  onChange?: (value: string) => void
  disabled?: boolean
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const { customModels, updateSetting } = useSettingsStore()

  const models = useMemo(() => {
    const customItems = customModels.map((m) => ({ value: m, label: m, isCustom: true }))
    const defaultItems = defaultModels.map((m) => ({ ...m, isCustom: false }))
    return [...customItems, ...defaultItems]
  }, [customModels])

  const addCustomModel = (newModel: string) => {
    const newValue = newModel.trim()
    if (!newValue) return
    const exists = models.some((m) => m.value === newValue)
    if (exists) {
      onChange?.(newValue)
      setOpen(false)
      setSearchValue('')
      return
    }
    updateSetting('customModels', [...customModels, newValue])
    onChange?.(newValue)
    setSearchValue('')
    setOpen(false)
  }

  const deleteCustomModel = (val: string) => {
    updateSetting(
      'customModels',
      customModels.filter((m) => m !== val)
    )
    if (value === val) {
      onChange?.('')
    }
  }

  const filtered = models.filter((m) => m.label.toLowerCase().includes(searchValue.toLowerCase()))
  const showCreate =
    searchValue && !filtered.some((m) => m.label.toLowerCase() === searchValue.toLowerCase())

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn('w-60 justify-between', className)}
        >
          {value ? (models.find((m) => m.value === value)?.label ?? value) : '选择模型...'}
          <ChevronsUpDown className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-60 p-0">
        <Command>
          <CommandInput
            placeholder="输入以搜索或创建..."
            className="h-9"
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandList>
            <CommandEmpty>未找到结果</CommandEmpty>
            <CommandGroup>
              {filtered.map((m) => (
                <div key={m.value} className="group flex">
                  <CommandItem
                    value={m.value}
                    onSelect={(current) => {
                      onChange?.(current === value ? '' : current)
                      setSearchValue('')
                      setOpen(false)
                    }}
                    className="flex-1"
                  >
                    {m.label}
                    <Check
                      className={cn('ml-auto', value === m.value ? 'opacity-100' : 'opacity-0')}
                    />
                  </CommandItem>
                  {m.isCustom && (
                    <div className="hidden group-hover:flex">
                      <button
                        className="text-gray-400 hover:text-red-500 cursor-pointer"
                        onClick={() => deleteCustomModel(m.value)}
                      >
                        <X className="h-6 w-6" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {showCreate && (
                <CommandItem
                  value={`create-${searchValue}`}
                  onSelect={() => addCustomModel(searchValue)}
                  className="!text-blue-600"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  创建 “{searchValue}”
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
