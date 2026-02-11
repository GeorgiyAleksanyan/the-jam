'use client';

import { useEffect, useRef } from 'react';

export default function GiscusComments() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current || ref.current.hasChildNodes()) return;

    const script = document.createElement('script');
    script.src = 'https://giscus.app/client.js';
    script.async = true;
    script.crossOrigin = 'anonymous';
    
    // Configure these for your repo
    script.setAttribute('data-repo', 'GeorgiyAleksanyan/the-jam');
    script.setAttribute('data-repo-id', 'R_kgDORImCvA');
    script.setAttribute('data-category', 'General');
    script.setAttribute('data-category-id', 'DIC_kwDORImCvM4C16w3');
    script.setAttribute('data-mapping', 'pathname');
    script.setAttribute('data-strict', '0');
    script.setAttribute('data-reactions-enabled', '1');
    script.setAttribute('data-emit-metadata', '0');
    script.setAttribute('data-input-position', 'bottom');
    script.setAttribute('data-theme', 'dark_dimmed');
    script.setAttribute('data-lang', 'en');

    ref.current.appendChild(script);
  }, []);

  return (
    <div 
      ref={ref} 
      className="giscus-container w-full overflow-hidden"
      style={{ minHeight: '200px' }}
    />
  );
}
