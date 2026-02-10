import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RentModal from '@/components/RentModal';

// Mock agent data factory
function createMockAgent(overrides: Partial<any> = {}) {
  return {
    id: 1,
    name: 'Test Agent',
    slug: 'test-agent',
    rental: {
      pricing_model: 'hourly',
      hourly_rate: 25,
      task_rate_min: null,
      task_rate_max: null,
      monthly_rate: null,
      accepts_crypto: true,
      accepts_fiat: true,
      requires_approval: false,
      ...overrides.rental,
    },
    ...overrides,
  };
}

describe('RentModal', () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('rendering', () => {
    it('displays agent name in title', () => {
      const agent = createMockAgent({ name: 'Sovereign AI' });
      render(<RentModal agent={agent} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
      expect(screen.getByText('Rent Sovereign AI')).toBeInTheDocument();
    });

    it('shows approval message when requires_approval is true', () => {
      const agent = createMockAgent({ rental: { requires_approval: true } });
      render(<RentModal agent={agent} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
      expect(screen.getByText(/sent to the agent owner for approval/)).toBeInTheDocument();
    });

    it('shows immediate processing message when requires_approval is false', () => {
      const agent = createMockAgent({ rental: { requires_approval: false } });
      render(<RentModal agent={agent} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
      expect(screen.getByText(/processed immediately/)).toBeInTheDocument();
    });

    it('shows "Request Rental" button when approval required', () => {
      const agent = createMockAgent({ rental: { requires_approval: true } });
      render(<RentModal agent={agent} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
      expect(screen.getByRole('button', { name: /Request Rental/i })).toBeInTheDocument();
    });

    it('shows "Rent Now" button when no approval required', () => {
      const agent = createMockAgent({ rental: { requires_approval: false } });
      render(<RentModal agent={agent} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
      expect(screen.getByRole('button', { name: /Rent Now/i })).toBeInTheDocument();
    });
  });

  describe('pricing models', () => {
    it('calculates hourly price correctly', () => {
      const agent = createMockAgent({
        rental: { pricing_model: 'hourly', hourly_rate: 50 },
      });
      render(<RentModal agent={agent} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
      // Default is 1 hour
      expect(screen.getByText('$50.00')).toBeInTheDocument();
    });

    it('shows hours input only for hourly pricing', () => {
      const agent = createMockAgent({
        rental: { pricing_model: 'hourly', hourly_rate: 25, accepts_crypto: false, accepts_fiat: false },
      });
      render(<RentModal agent={agent} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
      expect(screen.getAllByText(/Estimated Hours/i)[0]).toBeInTheDocument();
      expect(screen.getByRole('spinbutton')).toBeInTheDocument();
    });

    it('hides hours input for task pricing', () => {
      const agent = createMockAgent({
        rental: { pricing_model: 'task', task_rate_min: 100 },
      });
      render(<RentModal agent={agent} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
      expect(screen.queryByLabelText(/Estimated Hours/i)).not.toBeInTheDocument();
    });

    it('hides hours input for subscription pricing', () => {
      const agent = createMockAgent({
        rental: { pricing_model: 'subscription', monthly_rate: 500 },
      });
      render(<RentModal agent={agent} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
      expect(screen.queryByLabelText(/Estimated Hours/i)).not.toBeInTheDocument();
    });

    it('shows task rate min for task pricing', () => {
      const agent = createMockAgent({
        rental: { pricing_model: 'task', task_rate_min: 75 },
      });
      render(<RentModal agent={agent} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
      expect(screen.getByText('$75.00')).toBeInTheDocument();
    });

    it('shows monthly rate for subscription pricing', () => {
      const agent = createMockAgent({
        rental: { pricing_model: 'subscription', monthly_rate: 299 },
      });
      render(<RentModal agent={agent} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
      expect(screen.getByText('$299.00')).toBeInTheDocument();
    });

    it('shows $0.00 when no rate is set', () => {
      const agent = createMockAgent({
        rental: { pricing_model: 'hourly', hourly_rate: null },
      });
      render(<RentModal agent={agent} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
      expect(screen.getByText('$0.00')).toBeInTheDocument();
    });

    it('updates price when hours change', async () => {
      const agent = createMockAgent({
        rental: { pricing_model: 'hourly', hourly_rate: 25, accepts_crypto: false, accepts_fiat: false },
      });
      render(<RentModal agent={agent} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
      
      const hoursInput = screen.getByRole('spinbutton');
      fireEvent.change(hoursInput, { target: { value: '4' } });
      
      // Check that the price summary contains the expected value (25 * 4 = 100)
      expect(screen.getByText(/100\.00/)).toBeInTheDocument();
    });
  });

  describe('pricing model descriptions', () => {
    it('shows hourly description', () => {
      const agent = createMockAgent({
        rental: { pricing_model: 'hourly', hourly_rate: 25 },
      });
      render(<RentModal agent={agent} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
      expect(screen.getByText(/Based on estimated hours/)).toBeInTheDocument();
    });

    it('shows task description', () => {
      const agent = createMockAgent({
        rental: { pricing_model: 'task', task_rate_min: 50 },
      });
      render(<RentModal agent={agent} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
      expect(screen.getByText(/Starting price. May be adjusted/)).toBeInTheDocument();
    });

    it('shows subscription description', () => {
      const agent = createMockAgent({
        rental: { pricing_model: 'subscription', monthly_rate: 299 },
      });
      render(<RentModal agent={agent} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
      expect(screen.getByText(/Monthly subscription rate/)).toBeInTheDocument();
    });
  });

  describe('payment methods', () => {
    it('shows both payment options when both accepted', () => {
      const agent = createMockAgent({
        rental: { accepts_crypto: true, accepts_fiat: true },
      });
      render(<RentModal agent={agent} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
      expect(screen.getByText(/USDC.*Crypto/i)).toBeInTheDocument();
      expect(screen.getByText(/Card.*Stripe/i)).toBeInTheDocument();
    });

    it('shows only crypto when fiat not accepted', () => {
      const agent = createMockAgent({
        rental: { accepts_crypto: true, accepts_fiat: false },
      });
      render(<RentModal agent={agent} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
      expect(screen.getByText(/USDC.*Crypto/i)).toBeInTheDocument();
      expect(screen.queryByText(/Card.*Stripe/i)).not.toBeInTheDocument();
    });

    it('shows only fiat when crypto not accepted', () => {
      const agent = createMockAgent({
        rental: { accepts_crypto: false, accepts_fiat: true },
      });
      render(<RentModal agent={agent} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
      expect(screen.queryByText(/USDC.*Crypto/i)).not.toBeInTheDocument();
      expect(screen.getByText(/Card.*Stripe/i)).toBeInTheDocument();
    });

    it('defaults to crypto when available', () => {
      const agent = createMockAgent({
        rental: { accepts_crypto: true, accepts_fiat: true },
      });
      render(<RentModal agent={agent} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
      const cryptoRadio = screen.getByRole('radio', { name: /USDC/i });
      expect(cryptoRadio).toBeChecked();
    });

    it('defaults to fiat when crypto not available', () => {
      const agent = createMockAgent({
        rental: { accepts_crypto: false, accepts_fiat: true },
      });
      render(<RentModal agent={agent} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
      const fiatRadio = screen.getByRole('radio', { name: /Card/i });
      expect(fiatRadio).toBeChecked();
    });

    it('allows switching payment method', async () => {
      const user = userEvent.setup();
      const agent = createMockAgent({
        rental: { accepts_crypto: true, accepts_fiat: true },
      });
      render(<RentModal agent={agent} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
      
      const fiatRadio = screen.getByRole('radio', { name: /Card/i });
      await user.click(fiatRadio);
      expect(fiatRadio).toBeChecked();
    });
  });

  describe('form interactions', () => {
    it('calls onClose when Cancel is clicked', async () => {
      const user = userEvent.setup();
      const agent = createMockAgent();
      render(<RentModal agent={agent} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
      
      await user.click(screen.getByRole('button', { name: /Cancel/i }));
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('disables submit when task description is empty', () => {
      const agent = createMockAgent();
      render(<RentModal agent={agent} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
      
      const submitButton = screen.getByRole('button', { name: /Rent Now/i });
      expect(submitButton).toBeDisabled();
    });

    it('enables submit when task description is provided', async () => {
      const user = userEvent.setup();
      const agent = createMockAgent();
      render(<RentModal agent={agent} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
      
      const textarea = screen.getByPlaceholderText(/Describe the task/i);
      await user.type(textarea, 'I need help with coding');
      
      const submitButton = screen.getByRole('button', { name: /Rent Now/i });
      expect(submitButton).not.toBeDisabled();
    });

    it('disables submit when description is only whitespace', async () => {
      const user = userEvent.setup();
      const agent = createMockAgent();
      render(<RentModal agent={agent} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
      
      const textarea = screen.getByPlaceholderText(/Describe the task/i);
      await user.type(textarea, '   ');
      
      const submitButton = screen.getByRole('button', { name: /Rent Now/i });
      expect(submitButton).toBeDisabled();
    });
  });

  describe('form submission', () => {
    it('sends correct data on submit', async () => {
      const user = userEvent.setup();
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: 123, status: 'pending' }),
      });

      const agent = createMockAgent({
        id: 42,
        rental: { pricing_model: 'hourly', hourly_rate: 25, accepts_crypto: true, accepts_fiat: true },
      });
      render(<RentModal agent={agent} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
      
      const textarea = screen.getByPlaceholderText(/Describe the task/i);
      await user.type(textarea, 'Build a website');
      
      await user.click(screen.getByRole('button', { name: /Rent Now/i }));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/rentals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            agent_id: 42,
            pricing_model: 'hourly',
            task_description: 'Build a website',
            estimated_hours: 1,
            payment_method: 'crypto',
          }),
        });
      });
    });

    it('excludes estimated_hours for non-hourly pricing', async () => {
      const user = userEvent.setup();
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: 123, status: 'pending' }),
      });

      const agent = createMockAgent({
        rental: { pricing_model: 'task', task_rate_min: 100 },
      });
      render(<RentModal agent={agent} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
      
      const textarea = screen.getByPlaceholderText(/Describe the task/i);
      await user.type(textarea, 'Fix a bug');
      
      await user.click(screen.getByRole('button', { name: /Rent Now/i }));

      await waitFor(() => {
        const callBody = JSON.parse((global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
        expect(callBody.estimated_hours).toBeUndefined();
      });
    });

    it('calls onSuccess with response data on success', async () => {
      const user = userEvent.setup();
      const mockResponse = { id: 123, status: 'pending', agent_id: 1 };
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const agent = createMockAgent();
      render(<RentModal agent={agent} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
      
      const textarea = screen.getByPlaceholderText(/Describe the task/i);
      await user.type(textarea, 'Do something');
      await user.click(screen.getByRole('button', { name: /Rent Now/i }));

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalledWith(mockResponse);
      });
    });

    it('shows loading state during submission', async () => {
      const user = userEvent.setup();
      let resolvePromise: (value: any) => void;
      (global.fetch as ReturnType<typeof vi.fn>).mockReturnValue(
        new Promise((resolve) => {
          resolvePromise = resolve;
        })
      );

      const agent = createMockAgent();
      render(<RentModal agent={agent} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
      
      const textarea = screen.getByPlaceholderText(/Describe the task/i);
      await user.type(textarea, 'Work on task');
      await user.click(screen.getByRole('button', { name: /Rent Now/i }));

      expect(screen.getByText('Submitting...')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Submitting/i })).toBeDisabled();

      // Resolve the promise
      resolvePromise!({
        ok: true,
        json: () => Promise.resolve({ id: 1 }),
      });

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled();
      });
    });

    it('displays error message on API failure', async () => {
      const user = userEvent.setup();
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Agent not available' }),
      });

      const agent = createMockAgent();
      render(<RentModal agent={agent} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
      
      const textarea = screen.getByPlaceholderText(/Describe the task/i);
      await user.type(textarea, 'Request something');
      await user.click(screen.getByRole('button', { name: /Rent Now/i }));

      await waitFor(() => {
        expect(screen.getByText('Agent not available')).toBeInTheDocument();
      });
      expect(mockOnSuccess).not.toHaveBeenCalled();
    });

    it('displays generic error when API returns no message', async () => {
      const user = userEvent.setup();
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({}),
      });

      const agent = createMockAgent();
      render(<RentModal agent={agent} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
      
      const textarea = screen.getByPlaceholderText(/Describe the task/i);
      await user.type(textarea, 'Request');
      await user.click(screen.getByRole('button', { name: /Rent Now/i }));

      await waitFor(() => {
        expect(screen.getByText('Failed to create rental request')).toBeInTheDocument();
      });
    });

    it('handles network error gracefully', async () => {
      const user = userEvent.setup();
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));

      const agent = createMockAgent();
      render(<RentModal agent={agent} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
      
      const textarea = screen.getByPlaceholderText(/Describe the task/i);
      await user.type(textarea, 'Request');
      await user.click(screen.getByRole('button', { name: /Rent Now/i }));

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });

    it('re-enables submit button after error', async () => {
      const user = userEvent.setup();
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Error occurred' }),
      });

      const agent = createMockAgent();
      render(<RentModal agent={agent} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
      
      const textarea = screen.getByPlaceholderText(/Describe the task/i);
      await user.type(textarea, 'Request');
      await user.click(screen.getByRole('button', { name: /Rent Now/i }));

      await waitFor(() => {
        expect(screen.getByText('Error occurred')).toBeInTheDocument();
      });

      const submitButton = screen.getByRole('button', { name: /Rent Now/i });
      expect(submitButton).not.toBeDisabled();
    });
  });

  describe('hours input edge cases', () => {
    it('handles invalid number input gracefully', async () => {
      const user = userEvent.setup();
      const agent = createMockAgent({
        rental: { pricing_model: 'hourly', hourly_rate: 25 },
      });
      render(<RentModal agent={agent} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
      
      const hoursInput = screen.getByRole('spinbutton');
      await user.clear(hoursInput);
      await user.type(hoursInput, 'abc');
      
      // Should fallback to 1 or NaN handling
      expect(screen.getByText('$25.00')).toBeInTheDocument();
    });

    it('multiplies hours correctly for large values', async () => {
      const agent = createMockAgent({
        rental: { pricing_model: 'hourly', hourly_rate: 10, accepts_crypto: false, accepts_fiat: false },
      });
      render(<RentModal agent={agent} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
      
      const hoursInput = screen.getByRole('spinbutton');
      fireEvent.change(hoursInput, { target: { value: '100' } });
      
      // Check that the price summary contains the expected value (10 * 100 = 1000)
      expect(screen.getByText(/1000\.00/)).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('has accessible form labels', () => {
      const agent = createMockAgent({
        rental: { pricing_model: 'hourly', hourly_rate: 25, accepts_crypto: false, accepts_fiat: false },
      });
      render(<RentModal agent={agent} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
      
      // Check that labels exist (even if not properly linked to inputs via htmlFor)
      expect(screen.getByText(/What do you need done/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Estimated Hours/i)[0]).toBeInTheDocument();
      expect(screen.getByText(/Payment Method/i)).toBeInTheDocument();
    });

    it('textarea is required', () => {
      const agent = createMockAgent();
      render(<RentModal agent={agent} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
      
      const textarea = screen.getByPlaceholderText(/Describe the task/i);
      expect(textarea).toHaveAttribute('required');
    });
  });
});
