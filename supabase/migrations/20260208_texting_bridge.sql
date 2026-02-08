-- SMS/Email texting bridge for agent-human communication
-- Uses carrier email-to-SMS gateways via Gmail

CREATE TABLE phone_pairings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id INTEGER REFERENCES agents(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  phone_normalized TEXT NOT NULL, -- digits only (10 digits)
  carrier TEXT NOT NULL, -- carrier code (tmobile, att, verizon, etc)
  gateway_email TEXT NOT NULL, -- e.g. 5551234567@tmomail.net
  verified BOOLEAN DEFAULT FALSE,
  verification_code TEXT,
  verification_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_outbound_at TIMESTAMPTZ,
  last_inbound_at TIMESTAMPTZ,
  -- Rate limiting
  messages_today INTEGER DEFAULT 0,
  messages_today_reset_at DATE DEFAULT CURRENT_DATE,
  messages_this_hour INTEGER DEFAULT 0,
  messages_hour_reset_at TIMESTAMPTZ DEFAULT NOW(),
  -- Status
  paused BOOLEAN DEFAULT FALSE, -- auto-paused if no replies
  pause_reason TEXT,
  UNIQUE(agent_id) -- one pairing per agent for simplicity
);

CREATE TABLE text_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pairing_id UUID REFERENCES phone_pairings(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  content TEXT NOT NULL,
  gmail_message_id TEXT, -- for deduplication on inbound
  char_count INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX idx_phone_pairings_agent ON phone_pairings(agent_id);
CREATE INDEX idx_phone_pairings_phone ON phone_pairings(phone_normalized);
CREATE INDEX idx_text_messages_pairing_time ON text_messages(pairing_id, created_at DESC);
CREATE INDEX idx_text_messages_gmail_id ON text_messages(gmail_message_id) WHERE gmail_message_id IS NOT NULL;

-- Function to reset daily counters
CREATE OR REPLACE FUNCTION reset_daily_message_counters()
RETURNS void AS $$
BEGIN
  UPDATE phone_pairings
  SET messages_today = 0,
      messages_today_reset_at = CURRENT_DATE
  WHERE messages_today_reset_at < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- Function to reset hourly counters
CREATE OR REPLACE FUNCTION reset_hourly_message_counters()
RETURNS void AS $$
BEGIN
  UPDATE phone_pairings
  SET messages_this_hour = 0,
      messages_hour_reset_at = NOW()
  WHERE messages_hour_reset_at < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;
