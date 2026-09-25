import { findProvider } from './providers'

/**
 * One saved AI endpoint: everything needed to send a request. The app keeps a
 * list of these so the user can jump between, say, a DeepSeek profile and an
 * OpenAI one without retyping the URL and key.
 */
export interface ApiProfile {
  id: string
  /** User-facing label, e.g. 「DeepSeek 主力」 */
  name: string
  apiBaseURL: string
  apiKey: string
  model: string
}

let profileSeq = 0

/** Ids only need to be unique within one installation, so a counter suffices */
export function createProfileId(): string {
  profileSeq += 1
  return `profile-${Date.now().toString(36)}-${profileSeq}`
}

export function createProfile(partial?: Partial<ApiProfile>): ApiProfile {
  const baseURL = partial?.apiBaseURL ?? ''
  return {
    id: createProfileId(),
    name: partial?.name || '新配置',
    apiBaseURL: baseURL,
    apiKey: partial?.apiKey ?? '',
    model: partial?.model ?? findProvider(baseURL)?.defaultModel ?? ''
  }
}
