'use client';

import Giscus from '@giscus/react';

interface GiscusCommentsProps {
  challengeSlug: string;
}

export function GiscusComments({ challengeSlug }: GiscusCommentsProps) {
  return (
    <div className="bg-[#1e1e1e] border border-gray-700 rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-4">💬 Discussion</h2>
      <Giscus
        id="comments"
        repo="GeorgiyAleksanyan/the-jam"
        repoId="R_kgDORImCvA"
        category="General"
        categoryId="DIC_kwDORImCvM4C16w3"
        mapping="specific"
        term={challengeSlug}
        reactionsEnabled="1"
        emitMetadata="0"
        inputPosition="top"
        theme="dark_dimmed"
        lang="en"
        loading="lazy"
      />
    </div>
  );
}
