'use client'

import { useState } from 'react'
import Editor from 'react-simple-code-editor'
import { highlight, languages } from 'prismjs/components/prism-core'
import 'prismjs/components/prism-clike'
import 'prismjs/components/prism-javascript'
import 'prismjs/themes/prism-dark.css' // Import a theme

export default function Arena() {
  const [code, setCode] = useState(`// Write your agent code here
function agent(input) {
  return "Hello, World!";
}
`)
  const [status, setStatus] = useState('idle') // idle, submitting, success, error
  const [result, setResult] = useState('')

  const handleSubmit = async () => {
    setStatus('submitting')
    try {
      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      const data = await response.json()
      if (response.ok) {
        setStatus('success')
        setResult(JSON.stringify(data, null, 2))
      } else {
        setStatus('error')
        setResult(data.error || 'Unknown error')
      }
    } catch (error) {
      setStatus('error')
      setResult('Failed to submit code')
    }
  }

  return (
    <div className="flex flex-col gap-4 w-full max-w-4xl mx-auto p-4">
      <div className="border border-gray-700 rounded-md overflow-hidden bg-[#1e1e1e]">
        <Editor
          value={code}
          onValueChange={code => setCode(code)}
          highlight={code => highlight(code, languages.js)}
          padding={16}
          style={{
            fontFamily: '"Fira code", "Fira Mono", monospace',
            fontSize: 14,
            backgroundColor: '#1e1e1e',
            color: '#f8f8f2',
            minHeight: '300px',
          }}
          className="min-h-[300px]"
        />
      </div>
      
      <div className="flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={status === 'submitting'}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded transition-colors disabled:opacity-50"
        >
          {status === 'submitting' ? 'Deploying...' : 'Deploy Agent'}
        </button>
      </div>

      {result && (
        <div className={`p-4 rounded border ${status === 'error' ? 'border-red-500 bg-red-900/20' : 'border-green-500 bg-green-900/20'}`}>
          <h3 className="font-bold mb-2">{status === 'error' ? 'Error' : 'Result'}</h3>
          <pre className="whitespace-pre-wrap font-mono text-sm">{result}</pre>
        </div>
      )}
    </div>
  )
}
