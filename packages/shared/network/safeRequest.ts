import axios, { type AxiosRequestConfig, type AxiosResponse } from 'axios'

import { assertNetworkAllowed } from '../config/intranet'

export async function safeFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  assertNetworkAllowed(resolveRequestUrl(input))
  return fetch(input, init)
}

export function safeAxios<T = unknown, R = AxiosResponse<T>>(config: AxiosRequestConfig): Promise<R> {
  const url = resolveAxiosUrl(config)
  if (url) {
    assertNetworkAllowed(url)
  }

  const axiosClient = axios as unknown as {
    get?: (url: string, config?: AxiosRequestConfig) => Promise<R>
    post?: (url: string, data?: unknown, config?: AxiosRequestConfig) => Promise<R>
    request?: (config: AxiosRequestConfig) => Promise<R>
  }

  if (typeof axiosClient.request === 'function') {
    return axiosClient.request(config)
  }
  if ((config.method ?? 'GET').toUpperCase() === 'GET' && config.url && typeof axiosClient.get === 'function') {
    return axiosClient.get(config.url, config)
  }
  if ((config.method ?? '').toUpperCase() === 'POST' && config.url && typeof axiosClient.post === 'function') {
    return axiosClient.post(config.url, config.data, config)
  }
  throw new Error('Axios client is not available')
}

export function safeEventSource(url: string | URL, eventSourceInitDict?: EventSourceInit): EventSource {
  const normalizedUrl = url.toString()
  assertNetworkAllowed(normalizedUrl)
  return new EventSource(normalizedUrl, eventSourceInitDict)
}

export function safeWebSocket(url: string | URL, protocols?: string | string[]): WebSocket {
  const normalizedUrl = url.toString()
  assertNetworkAllowed(normalizedUrl)
  return new WebSocket(normalizedUrl, protocols)
}

function resolveRequestUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') {
    return input
  }

  if (input instanceof URL) {
    return input.toString()
  }

  return input.url
}

function resolveAxiosUrl(config: AxiosRequestConfig): string | null {
  if (!config.url) {
    return config.baseURL ?? null
  }

  if (!config.baseURL) {
    return config.url
  }

  try {
    return new URL(config.url, config.baseURL).toString()
  } catch {
    return config.url
  }
}
