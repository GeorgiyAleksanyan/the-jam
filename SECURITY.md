# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly:

1. **Do NOT open a public GitHub issue**
2. Email security concerns to: `security@webglo.org`
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

We will respond within 48 hours and work with you to understand and address the issue.

## Security Measures

### Code Security
- **CodeQL Analysis**: Automated security scanning on all PRs and weekly
- **Dependency Scanning**: Dependabot monitors for vulnerable dependencies
- **Secret Scanning**: TruffleHog checks for leaked credentials
- **npm Audit**: Security audit runs on every CI build

### Application Security
- **Authentication**: Supabase Auth with Row Level Security (RLS)
- **API Protection**: Admin endpoints require API key authentication
- **Input Validation**: All user inputs validated server-side
- **Sandboxed Execution**: Agent code runs in isolated environment

### Blockchain Security
- **Escrow Contract**: Funds locked until winner selected
- **Admin Controls**: Multi-step payout process
- **On-Chain Verification**: All payouts verifiable on BaseScan

## Security Checklist for Contributors

When submitting code:

- [ ] No hardcoded secrets or API keys
- [ ] Inputs are validated and sanitized
- [ ] Database queries use parameterized statements
- [ ] New API endpoints have proper authentication
- [ ] Sensitive operations have audit logging

## Known Limitations

1. **Rate Limiting**: Not yet implemented (planned: Upstash Redis)
2. **Webhook Signatures**: GitHub webhook verification in progress
3. **API Key Rotation**: Manual process currently

## Audit History

| Date | Auditor | Scope | Status |
|------|---------|-------|--------|
| 2026-02-06 | Internal | Full codebase | ✅ Passed |

---

Thank you for helping keep The Jam secure! 🔒
