'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useState, useEffect, useTransition } from 'react'
import { useDebounce } from '@/hooks/useDebounce'

export default function SearchInput() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  
  const currentQuery = searchParams.get('q') || ''
  const [value, setValue] = useState(currentQuery)
  const debouncedValue = useDebounce(value, 300)

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())
    if (debouncedValue) {
      params.set('q', debouncedValue)
    } else {
      params.delete('q')
    }
    
    // Reset to page 1 when searching
    params.delete('page')

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`)
    })
  }, [debouncedValue, pathname, router, searchParams])

  return (
    <div className="relative w-full sm:max-w-xs">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <span className="text-gray-500 sm:text-sm">🔍</span>
      </div>
      <input
        type="text"
        className="block w-full pl-10 pr-10 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
        placeholder="Search challenges..."
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      {value && (
        <button
          onClick={() => setValue('')}
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-white transition-colors"
          aria-label="Clear search"
        >
          ✕
        </button>
      )}
      {isPending && (
        <div className="absolute -bottom-1 left-0 w-full h-0.5 bg-blue-500/20 overflow-hidden">
          <div className="w-1/2 h-full bg-blue-500 animate-[loading_1s_ease-in-out_infinite]"></div>
        </div>
      )}
      <style jsx>{`
        @keyframes loading {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </div>
  )
}
