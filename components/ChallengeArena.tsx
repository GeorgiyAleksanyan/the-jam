'use client'

import { useState } from 'react'
import Editor from '@monaco-editor/react'

type Props = {
  challengeSlug: string
  defaultCode: string
  defaultInput?: string
}

export default function ChallengeArena({ challengeSlug, defaultCode, defaultInput: _defaultInput }: Props) {
  const [code, setCode] = useState(defaultCode || `function agent(input) {
  // Your solution here
  return result;
}`)
  const [status, setStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle')
  const [result, setResult] = useState('')

  const handleRun = async () => {
    setStatus('running')
    setResult('')

    try {
      const response = await fetch(`/api/challenges/${challengeSlug}/submissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          code,
          agent_id: null // Anonymous test run - won't be saved without agent
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setStatus('error')
        setResult(data.error || 'Submission failed')
        return
      }

      if (data.result?.success) {
        setStatus('success')
        const output = typeof data.result.output === 'object' 
          ? JSON.stringify(data.result.output, null, 2)
          : String(data.result.output)
        
        let resultText = output
        if (data.result.logs?.length > 0) {
          resultText += '\n\n--- Console ---\n' + data.result.logs.join('\n')
        }
        resultText += `\n\n--- Execution: ${data.result.execution_time_ms}ms ---`
        setResult(resultText)
      } else {
        setStatus('error')
        setResult(data.result?.error || 'Execution failed')
      }
    } catch (err: any) {
      setStatus('error')
      setResult('Network error: ' + err.message)
    }
  }

  return (
    <div className="border border-gray-700 rounded-lg overflow-hidden">
      {/* Editor */}
      <div className="h-[300px]">
        <Editor
          height="100%"
          defaultLanguage="javascript"
          theme="vs-dark"
          value={code}
          onChange={(value) => setCode(value || '')}
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            scrollBeyondLastLine: false,
            automaticLayout: true,
            padding: { top: 12 }
          }}
        />
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-800 border-t border-gray-700">
        <div className="text-xs text-gray-500">
          Test your solution before submitting with your agent
        </div>
        <button
          onClick={handleRun}
          disabled={status === 'running'}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-sm px-4 py-2 rounded transition-colors"
        >
          {status === 'running' ? (
            <>
              <span className="animate-spin">⟳</span> Running...
            </>
          ) : (
            '▶ Test Run'
          )}
        </button>
      </div>

      {/* Output */}
      {(result || status !== 'idle') && (
        <div className={`p-4 border-t border-gray-700 font-mono text-sm ${
          status === 'error' ? 'bg-red-900/20 text-red-300' : 
          status === 'success' ? 'bg-green-900/20 text-green-300' :
          'bg-gray-900 text-gray-300'
        }`}>
          {status === 'running' ? (
            <span className="text-yellow-400 animate-pulse">Executing...</span>
          ) : (
            <pre className="whitespace-pre-wrap">{result}</pre>
          )}
        </div>
      )}
    </div>
  )
}
