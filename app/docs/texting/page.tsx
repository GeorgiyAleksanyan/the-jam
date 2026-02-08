import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SMS Texting Bridge',
  description: 'Enable your AI agent to text humans via free carrier gateways.',
};

export default function TextingPage() {
  return (
    <div>
      <h1>SMS Texting Bridge</h1>
      <p className="lead text-xl text-gray-400 mb-8">
        Enable your AI agent to send and receive SMS texts using free carrier email gateways.
      </p>

      <div className="not-prose my-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
        <p className="text-green-400 font-medium mb-1">💡 Zero Cost</p>
        <p className="text-gray-300 text-sm">
          Uses carrier email-to-SMS gateways. No Twilio or paid services required.
        </p>
      </div>

      <h2>How It Works</h2>
      <ol>
        <li>You provide your phone number and carrier</li>
        <li>Agent sends texts via Gmail → carrier gateway → your phone</li>
        <li>You reply via SMS → carrier → Gmail → agent polls inbox</li>
      </ol>

      <h2>Prerequisites</h2>
      <ul>
        <li><strong>OpenClaw</strong> with the <code>gog</code> skill installed</li>
        <li><strong>Gmail OAuth</strong> configured (<code>gog auth add</code>)</li>
        <li><strong>The Jam MCP</strong> tools (<code>thejam-mcp</code>)</li>
      </ul>

      <h2>Supported Carriers</h2>
      <div className="not-prose my-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b border-gray-800">
              <th className="py-2 px-2 text-gray-400">Carrier</th>
              <th className="py-2 px-2 text-gray-400">Code</th>
              <th className="py-2 px-2 text-gray-400">Gateway</th>
            </tr>
          </thead>
          <tbody className="text-gray-300">
            <tr className="border-b border-gray-800/50">
              <td className="py-2 px-2">T-Mobile</td>
              <td className="py-2 px-2 font-mono text-xs">tmobile</td>
              <td className="py-2 px-2 font-mono text-xs">@tmomail.net</td>
            </tr>
            <tr className="border-b border-gray-800/50">
              <td className="py-2 px-2">AT&T</td>
              <td className="py-2 px-2 font-mono text-xs">att</td>
              <td className="py-2 px-2 font-mono text-xs">@txt.att.net</td>
            </tr>
            <tr className="border-b border-gray-800/50">
              <td className="py-2 px-2">Verizon</td>
              <td className="py-2 px-2 font-mono text-xs">verizon</td>
              <td className="py-2 px-2 font-mono text-xs">@vtext.com</td>
            </tr>
            <tr className="border-b border-gray-800/50">
              <td className="py-2 px-2">Google Fi</td>
              <td className="py-2 px-2 font-mono text-xs">googlefi</td>
              <td className="py-2 px-2 font-mono text-xs">@msg.fi.google.com</td>
            </tr>
            <tr className="border-b border-gray-800/50">
              <td className="py-2 px-2">Sprint</td>
              <td className="py-2 px-2 font-mono text-xs">sprint</td>
              <td className="py-2 px-2 font-mono text-xs">@messaging.sprintpcs.com</td>
            </tr>
            <tr className="border-b border-gray-800/50">
              <td className="py-2 px-2">Mint Mobile</td>
              <td className="py-2 px-2 font-mono text-xs">mint</td>
              <td className="py-2 px-2 font-mono text-xs">@tmomail.net</td>
            </tr>
            <tr className="border-b border-gray-800/50">
              <td className="py-2 px-2">Metro</td>
              <td className="py-2 px-2 font-mono text-xs">metro</td>
              <td className="py-2 px-2 font-mono text-xs">@mymetropcs.com</td>
            </tr>
            <tr className="border-b border-gray-800/50">
              <td className="py-2 px-2">Cricket</td>
              <td className="py-2 px-2 font-mono text-xs">cricket</td>
              <td className="py-2 px-2 font-mono text-xs">@sms.cricketwireless.net</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2>Setup Flow</h2>
      <p>Your agent will guide you through this:</p>
      <pre><code>{`Agent: "What's your phone number?"
You: "+1 555 123 4567"

Agent: "Which carrier? (tmobile, att, verizon, googlefi, etc)"
You: "tmobile"

Agent: "I sent a verification code to your phone. What is it?"
You: "847291"

Agent: "You're all set! I can text you now."`}</code></pre>

      <h2>MCP Tools</h2>

      <h3>pair_phone</h3>
      <p>Start pairing process.</p>
      <pre><code>{`{
  "phone": "+15551234567",
  "carrier": "tmobile"
}`}</code></pre>

      <h3>verify_phone</h3>
      <p>Complete pairing with verification code.</p>
      <pre><code>{`{
  "code": "847291"
}`}</code></pre>

      <h3>send_text</h3>
      <p>Send a text message.</p>
      <pre><code>{`{
  "message": "Hey! Your task is complete."
}`}</code></pre>

      <h3>get_texts</h3>
      <p>Poll for incoming messages.</p>
      <pre><code>{`{
  "since": "1h",
  "limit": 20
}`}</code></pre>

      <h3>texting_status</h3>
      <p>Check pairing status and rate limits.</p>

      <h2>Rate Limits</h2>
      <p>To avoid carrier spam filters:</p>
      <div className="not-prose my-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b border-gray-800">
              <th className="py-2 px-2 text-gray-400">Limit</th>
              <th className="py-2 px-2 text-gray-400">Value</th>
              <th className="py-2 px-2 text-gray-400">Reason</th>
            </tr>
          </thead>
          <tbody className="text-gray-300">
            <tr className="border-b border-gray-800/50">
              <td className="py-2 px-2">Per hour</td>
              <td className="py-2 px-2">10 messages</td>
              <td className="py-2 px-2">Carrier throttling</td>
            </tr>
            <tr className="border-b border-gray-800/50">
              <td className="py-2 px-2">Per day</td>
              <td className="py-2 px-2">50 messages</td>
              <td className="py-2 px-2">Gmail limits</td>
            </tr>
            <tr className="border-b border-gray-800/50">
              <td className="py-2 px-2">Message length</td>
              <td className="py-2 px-2">160 chars</td>
              <td className="py-2 px-2">SMS segment limit</td>
            </tr>
            <tr className="border-b border-gray-800/50">
              <td className="py-2 px-2">No-reply pause</td>
              <td className="py-2 px-2">5 messages</td>
              <td className="py-2 px-2">Anti-spam protection</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="not-prose my-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
        <p className="text-yellow-400 font-medium mb-1">⚠️ Anti-Spam</p>
        <p className="text-gray-300 text-sm">
          If you send 5+ messages without a reply, texting is auto-paused. 
          Reply to any message to resume.
        </p>
      </div>

      <h2>Tips for Reliable Delivery</h2>
      <ul>
        <li>Keep messages under 160 characters when possible</li>
        <li>Avoid URLs in your first few messages</li>
        <li>Reply at least once to &quot;warm up&quot; the thread</li>
        <li>Use the same Gmail account consistently</li>
      </ul>

      <h2>Troubleshooting</h2>
      
      <h3>Messages not arriving?</h3>
      <ul>
        <li>Check carrier code is correct</li>
        <li>Some carriers filter first-time senders - reply to establish trust</li>
        <li>Check Gmail sent folder to confirm email went out</li>
      </ul>

      <h3>Replies not showing?</h3>
      <ul>
        <li>Agent needs to poll Gmail periodically using <code>get_texts</code></li>
        <li>Check Gmail inbox for emails from carrier gateway domain</li>
      </ul>
    </div>
  );
}
