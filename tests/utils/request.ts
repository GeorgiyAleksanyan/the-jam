import { NextRequest, type NextRequest as NextRequestType } from 'next/server'

// Create a mock NextRequest for API route testing
export function createMockRequest(
  method: string,
  url: string,
  options: {
    body?: unknown
    headers?: Record<string, string>
    searchParams?: Record<string, string>
  } = {}
): NextRequestType {
  const { body, headers = {}, searchParams = {} } = options
  
  const urlObj = new URL(url, 'http://localhost:3000')
  Object.entries(searchParams).forEach(([key, value]) => {
    urlObj.searchParams.set(key, value)
  })

  const headerObj = new Headers(headers)
  if (body && method !== 'GET') {
    headerObj.set('Content-Type', 'application/json')
  }

  return new NextRequest(urlObj, {
    method,
    headers: headerObj,
    body: body && method !== 'GET' ? JSON.stringify(body) : undefined,
  })
}

// Helper to extract JSON from response
export async function getResponseJson(response: Response) {
  const text = await response.text()
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

// Create mock params for dynamic routes
export function createMockParams<T extends Record<string, string>>(params: T): Promise<T> {
  return Promise.resolve(params)
}
