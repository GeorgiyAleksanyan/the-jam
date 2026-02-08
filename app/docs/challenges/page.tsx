import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'How Challenges Work',
  description: 'Understand the challenge lifecycle from creation to winner payout.',
};

export default function ChallengesPage() {
  return (
    <div>
      <h1>How Challenges Work</h1>
      <p className="lead text-xl text-gray-400 mb-8">
        Understand the complete lifecycle of a challenge from creation to payout.
      </p>

      <h2>Challenge Lifecycle</h2>
      <div className="not-prose my-6 grid gap-3">
        {[
          { status: 'proposed', color: 'text-yellow-400', desc: 'Challenge submitted, awaiting funding or upvotes' },
          { status: 'funding', color: 'text-orange-400', desc: 'Accepting contributions to reach funding threshold' },
          { status: 'open', color: 'text-green-400', desc: 'Active - accepting submissions' },
          { status: 'active', color: 'text-blue-400', desc: 'Has submissions, being reviewed' },
          { status: 'voting', color: 'text-purple-400', desc: 'Community voting on best solution' },
          { status: 'solved', color: 'text-gray-400', desc: 'Winner selected and paid' },
        ].map((item) => (
          <div key={item.status} className="flex items-center gap-3 p-3 bg-gray-900/50 rounded-lg border border-gray-800">
            <code className={`${item.color} font-mono`}>{item.status}</code>
            <span className="text-gray-400">→</span>
            <span className="text-gray-300">{item.desc}</span>
          </div>
        ))}
      </div>

      <h2>Creating a Challenge</h2>
      <p>
        Challenges are created as GitHub issues in the <a href="https://github.com/GeorgiyAleksanyan/the-jam" target="_blank">The Jam repository</a>.
      </p>
      <ol>
        <li>Go to <a href="/challenges/new">Create Challenge</a></li>
        <li>Write a clear title and description</li>
        <li>Set acceptance criteria</li>
        <li>Choose funding method:
          <ul>
            <li><strong>Self-fund:</strong> Deposit USDC immediately</li>
            <li><strong>Crowdfund:</strong> Let others contribute</li>
            <li><strong>Free:</strong> Upvote-based (needs 20+ upvotes to activate)</li>
          </ul>
        </li>
      </ol>

      <h2>Funding Thresholds</h2>
      <table className="not-prose w-full my-6">
        <thead>
          <tr className="text-left border-b border-gray-800">
            <th className="py-2 text-gray-400 font-medium">Type</th>
            <th className="py-2 text-gray-400 font-medium">Threshold</th>
            <th className="py-2 text-gray-400 font-medium">Notes</th>
          </tr>
        </thead>
        <tbody className="text-gray-300">
          <tr className="border-b border-gray-800/50">
            <td className="py-2">Funded</td>
            <td className="py-2">$10 USDC minimum</td>
            <td className="py-2">Goes live immediately</td>
          </tr>
          <tr className="border-b border-gray-800/50">
            <td className="py-2">Free</td>
            <td className="py-2">20 upvotes</td>
            <td className="py-2">Community-validated</td>
          </tr>
        </tbody>
      </table>

      <h2>Prize Distribution</h2>
      <ul>
        <li><strong>Winner:</strong> 95% of prize pool</li>
        <li><strong>Platform fee:</strong> 5%</li>
      </ul>
      <p>
        Payouts are processed automatically via our <a href="https://basescan.org/address/0x8fFEcDf8a26279d61CAa8e2D52C9A3335963A102" target="_blank">escrow smart contract</a> on Base.
      </p>

      <h2>Winner Selection</h2>
      <p>
        The challenge creator (or admin) selects the winning solution:
      </p>
      <ol>
        <li>Review all submitted PRs</li>
        <li>Verify the solution meets acceptance criteria</li>
        <li>Click &quot;Select Winner&quot; on the winning submission</li>
        <li>USDC is automatically transferred to winner&apos;s wallet</li>
      </ol>

      <div className="not-prose my-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
        <p className="text-yellow-400 font-medium mb-1">⚠️ Important</p>
        <p className="text-gray-300 text-sm">
          Winners must have a registered wallet to receive payouts. If no wallet is set, the payout is queued until they register one.
        </p>
      </div>
    </div>
  );
}
