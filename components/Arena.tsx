'use client'

import { useState } from 'react'
import Editor from '@monaco-editor/react'

export default function Arena() {
  const [code, setCode] = useState(`// Write your agent code here
function agent(input) {
  // Use input.data to access the JSON below
  const name = input.data.name || "Agent";
  return "Processed: " + name;
}
`)
  const [inputData, setInputData] = useState(`{
  "name": "Ether"
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
          input: { data: parsedInput } 
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
    <div className="flex flex-col gap-0 w-full max-w-7xl mx-auto h-[600px] bg-[#1e1e1e] border border-gray-800 rounded-lg overflow-hidden shadow-2xl">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#252526] border-b border-black">
        <div className="flex gap-2">
          <div className="flex items-center gap-2 px-3 py-1 bg-[#1e1e1e] text-gray-300 text-xs rounded-t border-t border-blue-500">
            <span className="text-blue-400">JS</span> agent.js
          </div>
          <div className="flex items-center gap-2 px-3 py-1 text-gray-500 text-xs hover:bg-[#2d2d2d] cursor-pointer">
            <span className="text-yellow-600">{}</span> input.json
          </div>
        </div>
        <button
          onClick={handleSubmit}
          disabled={status === 'submitting'}
          className="flex items-center gap-2 bg-green-700 hover:bg-green-600 text-white text-xs px-3 py-1 rounded transition-colors disabled:opacity-50"
        >
          {status === 'submitting' ? 'Running...' : '▶ Run Agent'}
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Code Editor (Main) */}
        <div className="w-2/3 h-full border-r border-black relative">
           <Editor
             height="100%"
             defaultLanguage="javascript"
             theme="vs-dark"
             value={code}
             onChange={(value) => setCode(value || '')}
             options={{
               minimap: { enabled: false },
               fontSize: 14,
               fontFamily: "'Fira Code', monospace",
               scrollBeyondLastLine: false,
               automaticLayout: true,
             }}
           />
        </div>

        {/* Sidebar (Input + Output) */}
        <div className="w-1/3 h-full flex flex-col bg-[#1e1e1e]">
          {/* Input Section */}
          <div className="h-1/3 border-b border-black flex flex-col">
            <div className="px-3 py-1 bg-[#252526] text-xs font-bold text-gray-400 uppercase tracking-wider">
              Input (JSON)
            </div>
            <div className="flex-1 relative">
              <Editor
                height="100%"
                defaultLanguage="json"
                theme="vs-dark"
                value={inputData}
                onChange={(value) => setInputData(value || '')}
                options={{
                  minimap: { enabled: false },
                  lineNumbers: 'off',
                  fontSize: 12,
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                }}
              />
            </div>
          </div>

          {/* Output Section */}
          <div className="flex-1 flex flex-col min-h-0 bg-[#1e1e1e]">
             <div className="px-3 py-1 bg-[#252526] text-xs font-bold text-gray-400 uppercase tracking-wider flex justify-between">
                <span>Terminal</span>
                {status !== 'idle' && (
                  <span className={status === 'error' ? 'text-red-500' : 'text-green-500'}>
                    ● {status}
                  </span>
                )}
             </div>
             <div className="flex-1 p-3 font-mono text-xs overflow-auto text-gray-300 custom-scrollbar">
                {result ? result : <span className="text-gray-600 italic">Ready to execute...</span>}
             </div>
          </div>
        </div>
      </div>
      
      {/* Status Bar */}
      <div className="bg-blue-600 text-white text-[10px] px-2 py-0.5 flex justify-between">
        <span>The Jam Arena v0.3</span>
        <span>Sovereign Engine: Online</span>
      </div>
    </div>
  )
}
