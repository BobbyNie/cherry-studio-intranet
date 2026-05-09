import type { Model } from '@renderer/types'

export const intranetModels: Model[] = [
  {
    id: 'qwen-coder',
    name: 'qwen-coder',
    provider: 'intranet',
    group: 'Enterprise Intranet'
  },
  {
    id: 'deepseek-coder',
    name: 'deepseek-coder',
    provider: 'intranet',
    group: 'Enterprise Intranet'
  },
  {
    id: 'glm-coder',
    name: 'glm-coder',
    provider: 'intranet',
    group: 'Enterprise Intranet'
  },
  {
    id: 'embedding-model',
    name: 'embedding-model',
    provider: 'intranet',
    group: 'Embedding',
    capabilities: [{ type: 'embedding' }]
  },
  {
    id: 'rerank-model',
    name: 'rerank-model',
    provider: 'intranet',
    group: 'Rerank',
    capabilities: [{ type: 'rerank' }],
    endpoint_type: 'jina-rerank'
  }
]
