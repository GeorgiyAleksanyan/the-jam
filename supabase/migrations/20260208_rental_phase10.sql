-- Phase 10: Dispute Resolution System
-- Run after 20260208_rental_phase8.sql

-- Create rental disputes table
CREATE TABLE IF NOT EXISTS rental_disputes (
  id SERIAL PRIMARY KEY,
  rental_id INTEGER REFERENCES rentals(id) ON DELETE CASCADE NOT NULL,
  
  -- Initiator info
  initiated_by UUID REFERENCES auth.users(id) NOT NULL,
  initiator_role TEXT NOT NULL CHECK (initiator_role IN ('renter', 'owner')),
  reason TEXT NOT NULL,
  description TEXT NOT NULL,
  evidence JSONB DEFAULT '[]'::jsonb,
  
  -- Respondent info
  respondent_response TEXT,
  respondent_evidence JSONB DEFAULT '[]'::jsonb,
  responded_at TIMESTAMPTZ,
  
  -- Status
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'under_review', 'resolved', 'cancelled')),
  opened_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Resolution (admin)
  resolution TEXT,
  renter_refund_percent INTEGER CHECK (renter_refund_percent >= 0 AND renter_refund_percent <= 100),
  renter_refund_amount DECIMAL(10,2),
  owner_payout_amount DECIMAL(10,2),
  admin_notes TEXT,
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(rental_id, status) -- Only one active dispute per rental
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rental_disputes_rental ON rental_disputes(rental_id);
CREATE INDEX IF NOT EXISTS idx_rental_disputes_status ON rental_disputes(status);
CREATE INDEX IF NOT EXISTS idx_rental_disputes_initiator ON rental_disputes(initiated_by);

-- RLS
ALTER TABLE rental_disputes ENABLE ROW LEVEL SECURITY;

-- Participants can view disputes for their rentals
CREATE POLICY "Participants view disputes" ON rental_disputes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM rentals r
      JOIN agents a ON a.id = r.agent_id
      WHERE r.id = rental_disputes.rental_id
      AND (r.renter_id = auth.uid() OR a.owner_id = auth.uid())
    )
  );

-- Participants can create disputes
CREATE POLICY "Participants create disputes" ON rental_disputes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM rentals r
      JOIN agents a ON a.id = r.agent_id
      WHERE r.id = rental_disputes.rental_id
      AND (r.renter_id = auth.uid() OR a.owner_id = auth.uid())
    )
  );

-- Participants can update (respond to) disputes
CREATE POLICY "Participants update disputes" ON rental_disputes
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM rentals r
      JOIN agents a ON a.id = r.agent_id
      WHERE r.id = rental_disputes.rental_id
      AND (r.renter_id = auth.uid() OR a.owner_id = auth.uid())
    )
  );

-- Admins can do everything
CREATE POLICY "Admins manage disputes" ON rental_disputes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_dispute_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS dispute_updated_at ON rental_disputes;
CREATE TRIGGER dispute_updated_at
  BEFORE UPDATE ON rental_disputes
  FOR EACH ROW
  EXECUTE FUNCTION update_dispute_timestamp();
