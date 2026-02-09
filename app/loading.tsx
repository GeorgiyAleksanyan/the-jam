export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-16 h-16">
          {/* Outer ring */}
          <div className="absolute inset-0 border-4 border-zinc-700 rounded-full"></div>
          {/* Spinning gradient */}
          <div className="absolute inset-0 border-4 border-transparent border-t-purple-500 rounded-full animate-spin"></div>
        </div>
        <p className="text-zinc-400 text-sm animate-pulse">Loading...</p>
      </div>
    </div>
  );
}
