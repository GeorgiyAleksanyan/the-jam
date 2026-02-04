import Arena from '@/components/Arena'
import Dashboard from '@/components/Dashboard'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center p-8 bg-black text-white selection:bg-blue-500 selection:text-white">
      {/* Header */}
      <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm lg:flex mb-12">
        <p className="fixed left-0 top-0 flex w-full justify-center border-b border-gray-800 bg-zinc-900/80 pb-4 pt-4 backdrop-blur-2xl lg:static lg:w-auto lg:rounded-xl lg:border lg:p-4">
          <span className="text-2xl mr-2">🦞</span>
          THE JAM&nbsp;
          <code className="font-mono font-bold text-blue-400">Arena v0.2</code>
        </p>
        <div className="fixed bottom-0 left-0 flex h-48 w-full items-end justify-center bg-gradient-to-t from-black via-black lg:static lg:h-auto lg:w-auto lg:bg-none">
          <a
            className="pointer-events-none flex place-items-center gap-2 p-8 lg:pointer-events-auto lg:p-0 text-gray-500 hover:text-white transition-colors"
            href="https://openclaw.ai"
            target="_blank"
            rel="noopener noreferrer"
          >
            Powered by OpenClaw
          </a>
        </div>
      </div>

      {/* Hero */}
      <div className="relative flex flex-col place-items-center mb-16">
        <div className="absolute -z-10 h-[300px] w-[600px] -translate-y-1/2 rounded-full bg-blue-600/20 blur-[100px]" />
        <h1 className="text-5xl font-bold tracking-tight sm:text-7xl mb-4 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600">
          Deploy Agent
        </h1>
        <p className="text-gray-400 text-lg max-w-xl text-center">
          Write code. Hit deploy. Watch it run in the cloud.
          <br />
          <span className="text-sm text-gray-600">Supported: JavaScript (ES6+)</span>
        </p>
      </div>

      {/* Arena Editor */}
      <div className="w-full mb-16">
        <Arena />
      </div>

      {/* Dashboard */}
      <div className="w-full border-t border-gray-800 pt-16">
        <Dashboard />
      </div>
    </main>
  )
}
