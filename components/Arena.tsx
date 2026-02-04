'use client'

import { useState, useEffect } from 'react'
import Editor from '@monaco-editor/react'

type Challenge = {
  id: string
  title: string
  description: string
  defaultCode: string
  defaultInput: string
}

const CHALLENGES: Challenge[] = [
  {
    id: 'sandbox',
    title: 'Sandbox (Playground)',
    description: 'Free form testing. No rules.',
    defaultCode: `// Write your agent code here
function agent(input) {
  return "Hello " + (input.data.name || "World");
}`,
    defaultInput: `{\n  "name": "Ether"\n}`
  },
  {
    id: 'flattener',
    title: 'Challenge: The Flattener',
    description: 'Flatten a nested JSON object into dot-notation keys.',
    defaultCode: `function agent(input) {
  const obj = input.data;
  const result = {};
  
  // TODO: Implement recursion to flatten 'obj'
  // Example: { a: { b: 1 } } -> { "a.b": 1 }
  
  return result;
}`,
    defaultInput: `{\n  "user": {\n    "name": "Sovereign",\n    "stats": {\n      "level": 99,\n      "class": "Construct"\n    }\n  },\n  "active": true\n}`
  }
]

export default function Arena() {
  const [activeChallenge, setActiveChallenge] = useState<Challenge>(CHALLENGES[0])
  const [code, setCode] = useState(activeChallenge.defaultCode)
  const [inputData, setInputData] = useState(activeChallenge.defaultInput)
  
  const [status, setStatus] = useState('idle')
  const [result, setResult] = useState('')

  // Reset editor when challenge changes
  const handleChallengeChange = (challengeId: string) => {
    const challenge = CHALLENGES.find(c => c.id === challengeId) || CHALLENGES[0]
    setActiveChallenge(challenge)
    setCode(challenge.defaultCode)
    setInputData(challenge.defaultInput)
    setResult('')
    setStatus('idle')
  }

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
    <div className="flex flex-col gap-0 w-full max-w-7xl mx-auto h-[650px] bg-[#1e1e1e] border border-gray-800 rounded-lg overflow-hidden shadow-2xl">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#252526] border-b border-black">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase text-gray-500 font-bold tracking-wider">Active Context</span>
            <select 
              value={activeChallenge.id}
              onChange={(e) => handleChallengeChange(e.target.value)}
              className="bg-transparent text-gray-200 text-sm font-medium focus:outline-none cursor-pointer hover:text-blue-400 transition-colors"
            >
              {CHALLENGES.map(c => (
                <option key={c.id} value={c.id} className="bg-[#1e1e1e]">{c.title}</option>
              ))}
            </select>
          </div>
          
          <div className="h-6 w-px bg-gray-700 mx-2" />
          
          <span className="text-xs text-gray-500 italic truncate max-w-[300px]">
            {activeChallenge.description}
          </span>
        </div>

        <button
          onClick={handleSubmit}
          disabled={status === 'submitting'}
          className="flex items-center gap-2 bg-green-700 hover:bg-green-600 text-white text-xs px-4 py-2 rounded transition-colors disabled:opacity-50 font-bold uppercase tracking-wide"
        >
          {status === 'submitting' ? 'Running...' : '▶ Run Agent'}
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Code Editor (Main) */}
        <div className="w-2/3 h-full border-r border-black relative flex flex-col">
           <div className="px-4 py-1 bg-[#1e1e1e] text-[10px] text-blue-400 font-mono border-b border-gray-800">
             AGENT.JS
           </div>
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
               padding: { top: 16 }
             }}
           />
        </div>

        {/* Sidebar (Input + Output) */}
        <div className="w-1/3 h-full flex flex-col bg-[#1e1e1e]">
          {/* Input Section */}
          <div className="h-1/3 border-b border-black flex flex-col">
            <div className="px-3 py-1 bg-[#252526] text-[10px] font-bold text-gray-400 uppercase tracking-wider flex justify-between items-center">
              <span>Input (JSON)</span>
              <span className="text-xs text-yellow-600">{}</span>
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
                  folding: false
                }}
              />
            </div>
          </div>

          {/* Output Section */}
          <div className="flex-1 flex flex-col min-h-0 bg-[#1e1e1e]">
             <div className="px-3 py-1 bg-[#252526] text-[10px] font-bold text-gray-400 uppercase tracking-wider flex justify-between items-center">
                <span>Terminal Output</span>
                {status !== 'idle' && (
                  <span className={`text-[10px] ${status === 'error' ? 'text-red-500' : 'text-green-500'}`}>
                    ● {status.toUpperCase()}
                  </span>
                )}
             </div>
             <div className="flex-1 p-3 font-mono text-xs overflow-auto text-gray-300 custom-scrollbar bg-[#181818]">
                {result ? result : <span className="text-gray-600 italic opacity-50">Waiting for execution...</span>}
             </div>
          </div>
        </div>
      </div>
      
      {/* Status Bar */}
      <div className="bg-[#007acc] text-white text-[10px] px-3 py-1 flex justify-between select-none">
        <div className="flex gap-4">
          <span>The Jam Arena</span>
          <span>Target: Node.js (Sandbox)</span>
        </div>
        <span>Ln {code.split('\n').length}, Col 1</span>
      </div>
    </div>
  )
}
