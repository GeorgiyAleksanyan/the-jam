'use client'

import { useState } from 'react'
import Editor from 'react-simple-code-editor'
import { highlight, languages } from 'prismjs/components/prism-core'
import 'prismjs/components/prism-clike'
import 'prismjs/components/prism-javascript'
import 'prismjs/components/prism-json'
import 'prismjs/themes/prism-dark.css'

export default function Arena() {
  const [code, setCode] = useState(`// Write your agent code here
function agent(input) {
  // Use input.data to access the JSON below
  return "Processed: " + input.data.message;
}
`)
  const [inputData, setInputData] = useState(`{
  "message": "Hello from input"
}`)
  const [status, setStatus] = useState('idle')
  const [result, setResult] = useState('')

  const handleSubmit = async () => {
    setStatus('submitting')
    try {
      let parsedInput = {}
      try {
        parsedInput = JSON.parse(inputData)
      } catch (e) {
        setStatus('error')
        setResult('Invalid Input JSON')
        return
      }

      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          code,
          input: { data: parsedInput } // Wrap it to match the comment example
        }),
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
    <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto p-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Code Editor (2/3 width) */}
        <div className="lg:col-span-2 flex flex-col gap-2">
          <label className="text-sm font-mono text-gray-400 uppercase">Agent Code (JS)</label>
          <div className="border border-gray-700 rounded-md overflow-hidden bg-[#1e1e1e] shadow-lg">
            <Editor
              value={code}
              onValueChange={(code: string) => setCode(code)}
              highlight={(code: string) => highlight(code, languages.js)}
              padding={16}
              style={{
                fontFamily: '"Fira code", "Fira Mono", monospace',
                fontSize: 14,
                backgroundColor: '#1e1e1e',
                color: '#f8f8f2',
                minHeight: '400px',
              }}
              className="min-h-[400px]"
            />
          </div>
        </div>

        {/* Input JSON Editor (1/3 width) */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-mono text-gray-400 uppercase">Input Data (JSON)</label>
          <div className="border border-gray-700 rounded-md overflow-hidden bg-[#1e1e1e] shadow-lg h-full">
            <Editor
              value={inputData}
              onValueChange={(code: string) => setInputData(code)}
              highlight={(code: string) => highlight(code, languages.json)}
              padding={16}
              style={{
                fontFamily: '"Fira code", "Fira Mono", monospace',
                fontSize: 14,
                backgroundColor: '#1e1e1e',
                color: '#f8f8f2',
                height: '100%',
                minHeight: '400px',
              }}
              className="h-full min-h-[400px]"
            />
          </div>
        </div>
      </div>
      
      <div className="flex justify-end pt-4 border-t border-gray-800">
        <button
          onClick={handleSubmit}
          disabled={status === 'submitting'}
          className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold py-3 px-8 rounded shadow-lg shadow-blue-900/20 transition-all disabled:opacity-50 transform active:scale-95"
        >
          {status === 'submitting' ? 'Running...' : 'Deploy & Run Agent'}
        </button>
      </div>

      {result && (
        <div className={`p-6 rounded-lg border ${status === 'error' ? 'border-red-500/50 bg-red-900/10' : 'border-green-500/50 bg-green-900/10'} shadow-2xl`}>
          <h3 className={`font-bold mb-3 font-mono text-lg ${status === 'error' ? 'text-red-400' : 'text-green-400'}`}>
            {status === 'error' ? 'Execution Error' : 'Execution Result'}
          </h3>
          <pre className="whitespace-pre-wrap font-mono text-sm overflow-x-auto text-gray-300">
            {result}
          </pre>
        </div>
      )}
    </div>
  )
}
