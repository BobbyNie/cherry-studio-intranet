import { describe, expect, it } from 'vitest'

import { normalizeAgentDataRow } from '../agentDataNormalization'

const fallbackTimestamp = '2026-07-24T08:00:00.000Z'

describe('normalizeAgentDataRow', () => {
  it.each([
    ['1784810600097Z', '2026-07-23T12:43:20.097Z'],
    ['1784810600Z', '2026-07-23T12:43:20.000Z']
  ])('normalizes epoch timestamp %s without changing valid fields', (updatedAt, expected) => {
    const row = {
      id: 'agent-1',
      created_at: '2026-07-06T11:47:07.757Z',
      updated_at: updatedAt,
      mcps: JSON.stringify(['server-id'])
    }

    const result = normalizeAgentDataRow(row, fallbackTimestamp)

    expect(result.normalizedRow.updated_at).toBe(expected)
    expect(result.normalizedRow.created_at).toBe(row.created_at)
    expect(result.normalizedRow.mcps).toBe(row.mcps)
    expect(result.repair?.updates).toEqual({ updated_at: expected })
  })

  it('keeps valid MCP IDs while removing corrupt entries', () => {
    const row = {
      id: 'agent-1',
      created_at: 'invalid-created-at',
      updated_at: 'invalid-updated-at',
      mcps: JSON.stringify(['server-id', { mcpServers: {} }, 7])
    }

    const result = normalizeAgentDataRow(row, fallbackTimestamp)

    expect(result.normalizedRow).toEqual(
      expect.objectContaining({
        created_at: fallbackTimestamp,
        updated_at: fallbackTimestamp,
        mcps: JSON.stringify(['server-id'])
      })
    )
    expect(result.repair).toEqual(
      expect.objectContaining({
        original: expect.objectContaining({ mcps: row.mcps }),
        updates: {
          created_at: fallbackTimestamp,
          updated_at: fallbackTimestamp,
          mcps: JSON.stringify(['server-id'])
        }
      })
    )
  })
})
