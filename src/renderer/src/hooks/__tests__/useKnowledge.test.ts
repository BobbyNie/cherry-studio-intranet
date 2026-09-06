import type { KnowledgeBase, KnowledgeItem } from '@renderer/types'
import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  dispatch: vi.fn(),
  remove: vi.fn(),
  checkAllBases: vi.fn(),
  setTimeoutTimer: vi.fn()
}))

const item = {
  id: 'item-1',
  type: 'url',
  content: 'https://intranet.example.test',
  processingStatus: 'completed',
  uniqueId: 'unique-id',
  uniqueIds: ['unique-id']
} as KnowledgeItem

const base = {
  id: 'base-1',
  name: 'Internal knowledge',
  items: [item]
} as KnowledgeBase

vi.mock('@renderer/databases', () => ({ db: { knowledge_notes: { get: vi.fn(), put: vi.fn() } } }))
vi.mock('@renderer/queue/KnowledgeQueue', () => ({ default: { checkAllBases: mocks.checkAllBases } }))
vi.mock('@renderer/services/KnowledgeService', () => ({ getKnowledgeBaseParams: vi.fn(() => ({ id: base.id })) }))
vi.mock('@renderer/store', () => ({ useAppDispatch: () => mocks.dispatch }))
vi.mock('react-redux', () => ({
  useDispatch: () => mocks.dispatch,
  useSelector: (selector: (state: unknown) => unknown) => selector({ knowledge: { bases: [base] } })
}))
vi.mock('../useAssistant', () => ({ useAssistants: () => ({ assistants: [] }) }))
vi.mock('../useAssistantPresets', () => ({ useAssistantPresets: () => ({ assistantPresets: [] }) }))
vi.mock('../useTimer', () => ({ useTimer: () => ({ setTimeoutTimer: mocks.setTimeoutTimer }) }))

import { useKnowledge } from '../useKnowledge'

describe('useKnowledge refreshItem', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.remove.mockResolvedValue(undefined)
    Object.defineProperty(window, 'api', {
      configurable: true,
      value: { knowledgeBase: { remove: mocks.remove } }
    })
  })

  it('removes, resets, and queues an eligible item exactly once', async () => {
    const { result } = renderHook(() => useKnowledge(base.id))

    await act(async () => {
      await result.current.refreshItem(item)
    })

    expect(mocks.remove).toHaveBeenCalledOnce()
    expect(mocks.dispatch).toHaveBeenCalledOnce()
    expect(mocks.setTimeoutTimer).toHaveBeenCalledOnce()
  })
})
