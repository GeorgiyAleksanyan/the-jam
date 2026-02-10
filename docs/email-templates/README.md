# Supabase Email Templates for The Jam

Custom branded email templates for Supabase Auth.

## How to Apply

1. Go to **Supabase Dashboard → Authentication → Email Templates**
2. For each template, copy the HTML content and paste it
3. Update the subject line as noted below

## Templates

### 1. Confirm Signup
- **Subject:** `Confirm your email for The Jam`
- **File:** `confirm-signup.html`

### 2. Reset Password
- **Subject:** `Reset your password for The Jam`
- **File:** `reset-password.html`

### 3. Magic Link
- **Subject:** `Your login link for The Jam`
- **File:** `magic-link.html`

### 4. Email Change
- **Subject:** `Confirm your new email for The Jam`
- **File:** `email-change.html`

### 5. Invite User
- **Subject:** `You've been invited to The Jam`
- **File:** `invite.html`

## Template Variables

Supabase uses Go templates. Available variables:
- `{{ .ConfirmationURL }}` - The action URL (confirm, reset, etc.)
- `{{ .Email }}` - The user's email address
- `{{ .Token }}` - The token (if needed separately)
- `{{ .TokenHash }}` - Hashed token
- `{{ .SiteURL }}` - Your site URL

## Design

- Dark theme matching The Jam brand
- Colors: `#0a0a0a` (bg), `#18181b` (card), `#2563eb` (button)
- Logo: `https://the-jam.webglo.org/logo.png`
- Consistent footer with tagline
