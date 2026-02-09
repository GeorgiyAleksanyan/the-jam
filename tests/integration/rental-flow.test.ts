/**
 * Integration tests for the rental flow
 * Tests: request → approve → pay → start → complete
 * 
 * These tests mock at the module level and test route handlers directly.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockRequest, createMockParams, getResponseJson } from '../utils/request';

// Mock data that can be modified per test
const mockData = {
  user: null as { id: string; email: string } | null,
  agent: {
    id: 1,
    name: 'Test Agent',
    slug: 'test-agent',
    owner_id: 'owner-user-id',
  },
  rentalProfile: {
    id: 1,
    agent_id: 1,
    is_available: true,
    requires_approval: true,
    max_concurrent_rentals: 3,
    current_rentals: 0,
    hourly_rate: 50,
    task_rate_min: 100,
    task_rate_max: 500,
    monthly_rate: 1000,
    currency: 'USD',
  },
  rental: null as any,
  rentals: [] as any[],
  agents: [] as any[],
};

// Mock Supabase modules before any imports
vi.mock('@/lib/supabase-server', () => ({
  createClient: vi.fn().mockImplementation(async () => ({
    auth: {
      getUser: vi.fn().mockImplementation(() => 
        Promise.resolve({ data: { user: mockData.user }, error: null })
      ),
    },
  })),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn().mockImplementation(() => {
    // Create a chainable mock that reads from mockData dynamically
    const createChainableMock = (tableType: string) => {
      let insertedData: any = null;
      
      const chainable: any = {
        select: vi.fn(() => chainable),
        insert: vi.fn((data: any) => {
          insertedData = data;
          // Simulate insert returning the inserted data
          if (data.agent_id && data.renter_id) {
            mockData.rental = {
              ...data,
              id: 1,
              created_at: new Date().toISOString(),
            };
          }
          return chainable;
        }),
        update: vi.fn((data: any) => {
          // Simulate update modifying the rental
          if (mockData.rental) {
            mockData.rental = { ...mockData.rental, ...data };
          }
          if (data.current_rentals !== undefined) {
            mockData.rentalProfile.current_rentals = data.current_rentals;
          }
          return chainable;
        }),
        delete: vi.fn(() => chainable),
        eq: vi.fn(() => chainable),
        neq: vi.fn(() => chainable),
        in: vi.fn(() => chainable),
        order: vi.fn(() => {
          // For list queries
          if (tableType === 'rentals') {
            return Promise.resolve({ data: mockData.rentals, error: null });
          }
          return chainable;
        }),
        limit: vi.fn(() => chainable),
        single: vi.fn(() => {
          // Dynamic resolution based on table type
          if (tableType === 'agents') {
            return Promise.resolve({ data: mockData.agent, error: null });
          }
          if (tableType === 'agent_rental_profiles') {
            return Promise.resolve({ data: mockData.rentalProfile, error: null });
          }
          if (tableType === 'rentals') {
            // If we just inserted, return the inserted rental
            if (insertedData) {
              const result = { ...mockData.rental, agent: mockData.agent };
              return Promise.resolve({ data: result, error: null });
            }
            // Otherwise return current rental state
            if (mockData.rental) {
              return Promise.resolve({ 
                data: { ...mockData.rental, agent: mockData.agent }, 
                error: null,
              });
            }
            return Promise.resolve({ data: null, error: { message: 'Not found' } });
          }
          return Promise.resolve({ data: null, error: null });
        }),
        maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
      };
      return chainable;
    };

    return {
      from: vi.fn((table: string) => createChainableMock(table)),
      rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
  }),
}));

// Import route handlers after mocking
import { POST as createRental, GET as listRentals } from '@/app/api/rentals/route';
import { GET as getRental, PATCH as updateRental } from '@/app/api/rentals/[id]/route';
import { POST as completeRental } from '@/app/api/rentals/[id]/complete/route';

describe('Rental Flow Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock data
    mockData.user = null;
    mockData.rental = null;
    mockData.rentals = [];
    mockData.agents = [];
    mockData.rentalProfile = {
      id: 1,
      agent_id: 1,
      is_available: true,
      requires_approval: true,
      max_concurrent_rentals: 3,
      current_rentals: 0,
      hourly_rate: 50,
      task_rate_min: 100,
      task_rate_max: 500,
      monthly_rate: 1000,
      currency: 'USD',
    };
    mockData.agent = {
      id: 1,
      name: 'Test Agent',
      slug: 'test-agent',
      owner_id: 'owner-user-id',
    };
  });

  describe('Step 1: Create Rental Request', () => {
    it('should require authentication', async () => {
      mockData.user = null;
      
      const request = createMockRequest('POST', '/api/rentals', {
        body: { agent_id: 1, pricing_model: 'task' },
      });

      const response = await createRental(request);
      expect(response.status).toBe(401);
    });

    it('should validate required fields', async () => {
      mockData.user = { id: 'renter-user-id', email: 'renter@example.com' };
      
      const request = createMockRequest('POST', '/api/rentals', {
        body: { agent_id: 1 }, // Missing pricing_model
      });

      const response = await createRental(request);
      const data = await getResponseJson(response);

      expect(response.status).toBe(400);
      expect(data.error).toContain('required');
    });

    it('should reject rental request for own agent', async () => {
      mockData.user = { id: 'owner-user-id', email: 'owner@example.com' };
      
      const request = createMockRequest('POST', '/api/rentals', {
        body: { agent_id: 1, pricing_model: 'task' },
      });

      const response = await createRental(request);
      const data = await getResponseJson(response);

      expect(response.status).toBe(400);
      expect(data.error).toBe('Cannot rent your own agent');
    });

    it('should reject when agent not available', async () => {
      mockData.user = { id: 'renter-user-id', email: 'renter@example.com' };
      mockData.rentalProfile.is_available = false;
      
      const request = createMockRequest('POST', '/api/rentals', {
        body: { agent_id: 1, pricing_model: 'task' },
      });

      const response = await createRental(request);
      const data = await getResponseJson(response);

      expect(response.status).toBe(400);
      expect(data.error).toBe('Agent is not currently available');
    });

    it('should reject when max concurrent rentals reached', async () => {
      mockData.user = { id: 'renter-user-id', email: 'renter@example.com' };
      mockData.rentalProfile.current_rentals = 3;
      mockData.rentalProfile.max_concurrent_rentals = 3;
      
      const request = createMockRequest('POST', '/api/rentals', {
        body: { agent_id: 1, pricing_model: 'task' },
      });

      const response = await createRental(request);
      const data = await getResponseJson(response);

      expect(response.status).toBe(400);
      expect(data.error).toBe('Agent has reached maximum concurrent rentals');
    });

    it('should create rental request when renter requests agent', async () => {
      mockData.user = { id: 'renter-user-id', email: 'renter@example.com' };
      
      const request = createMockRequest('POST', '/api/rentals', {
        body: {
          agent_id: 1,
          pricing_model: 'task',
          task_description: 'Build a feature',
          payment_method: 'crypto',
        },
      });

      const response = await createRental(request);
      const data = await getResponseJson(response);

      expect(response.status).toBe(200);
      expect(data.requires_approval).toBe(true);
    });

    it('should calculate hourly rate correctly', async () => {
      mockData.user = { id: 'renter-user-id', email: 'renter@example.com' };
      mockData.rentalProfile.hourly_rate = 75;
      
      const request = createMockRequest('POST', '/api/rentals', {
        body: {
          agent_id: 1,
          pricing_model: 'hourly',
          estimated_hours: 4,
        },
      });

      const response = await createRental(request);
      
      expect(response.status).toBe(200);
      // The rental should be created with agreed_price = 75 * 4 = 300
      expect(mockData.rental.agreed_price).toBe(300);
    });

    it('should use task minimum for task pricing', async () => {
      mockData.user = { id: 'renter-user-id', email: 'renter@example.com' };
      mockData.rentalProfile.task_rate_min = 150;
      
      const request = createMockRequest('POST', '/api/rentals', {
        body: { agent_id: 1, pricing_model: 'task' },
      });

      const response = await createRental(request);
      
      expect(response.status).toBe(200);
      expect(mockData.rental.agreed_price).toBe(150);
    });

    it('should use monthly rate for subscription pricing', async () => {
      mockData.user = { id: 'renter-user-id', email: 'renter@example.com' };
      mockData.rentalProfile.monthly_rate = 2000;
      
      const request = createMockRequest('POST', '/api/rentals', {
        body: { agent_id: 1, pricing_model: 'subscription' },
      });

      const response = await createRental(request);
      
      expect(response.status).toBe(200);
      expect(mockData.rental.agreed_price).toBe(2000);
    });

    it('should auto-approve when requires_approval is false', async () => {
      mockData.user = { id: 'renter-user-id', email: 'renter@example.com' };
      mockData.rentalProfile.requires_approval = false;
      
      const request = createMockRequest('POST', '/api/rentals', {
        body: { agent_id: 1, pricing_model: 'task' },
      });

      const response = await createRental(request);
      const data = await getResponseJson(response);

      expect(response.status).toBe(200);
      expect(data.requires_approval).toBe(false);
      expect(mockData.rental.status).toBe('approved');
    });
  });

  describe('Step 2: Approve/Reject Rental', () => {
    beforeEach(() => {
      mockData.rental = {
        id: 1,
        agent_id: 1,
        renter_id: 'renter-user-id',
        status: 'pending',
        pricing_model: 'task',
        agreed_price: 100,
      };
    });

    it('should not allow renter to approve', async () => {
      mockData.user = { id: 'renter-user-id', email: 'renter@example.com' };
      
      const request = createMockRequest('PATCH', '/api/rentals/1', {
        body: { action: 'approve' },
      });
      const params = createMockParams({ id: '1' });

      const response = await updateRental(request, { params });
      const data = await getResponseJson(response);

      expect(response.status).toBe(403);
      expect(data.error).toBe('Only agent owner can approve');
    });

    it('should allow owner to approve pending rental', async () => {
      mockData.user = { id: 'owner-user-id', email: 'owner@example.com' };
      
      const request = createMockRequest('PATCH', '/api/rentals/1', {
        body: { action: 'approve' },
      });
      const params = createMockParams({ id: '1' });

      const response = await updateRental(request, { params });

      expect(response.status).toBe(200);
      expect(mockData.rental.status).toBe('approved');
    });

    it('should allow owner to reject pending rental', async () => {
      mockData.user = { id: 'owner-user-id', email: 'owner@example.com' };
      
      const request = createMockRequest('PATCH', '/api/rentals/1', {
        body: { action: 'reject' },
      });
      const params = createMockParams({ id: '1' });

      const response = await updateRental(request, { params });

      expect(response.status).toBe(200);
      expect(mockData.rental.status).toBe('rejected');
    });

    it('should not allow approving non-pending rentals', async () => {
      mockData.user = { id: 'owner-user-id', email: 'owner@example.com' };
      mockData.rental.status = 'approved';
      
      const request = createMockRequest('PATCH', '/api/rentals/1', {
        body: { action: 'approve' },
      });
      const params = createMockParams({ id: '1' });

      const response = await updateRental(request, { params });
      const data = await getResponseJson(response);

      expect(response.status).toBe(400);
      expect(data.error).toBe('Can only approve pending rentals');
    });
  });

  describe('Step 3: Start Rental', () => {
    beforeEach(() => {
      mockData.rental = {
        id: 1,
        agent_id: 1,
        renter_id: 'renter-user-id',
        status: 'approved',
        pricing_model: 'task',
        agreed_price: 100,
      };
    });

    it('should allow starting approved rental', async () => {
      mockData.user = { id: 'renter-user-id', email: 'renter@example.com' };
      
      const request = createMockRequest('PATCH', '/api/rentals/1', {
        body: { action: 'start' },
      });
      const params = createMockParams({ id: '1' });

      const response = await updateRental(request, { params });

      expect(response.status).toBe(200);
      expect(mockData.rental.status).toBe('active');
      expect(mockData.rental.started_at).toBeDefined();
    });

    it('should not allow starting pending rental', async () => {
      mockData.user = { id: 'renter-user-id', email: 'renter@example.com' };
      mockData.rental.status = 'pending';
      
      const request = createMockRequest('PATCH', '/api/rentals/1', {
        body: { action: 'start' },
      });
      const params = createMockParams({ id: '1' });

      const response = await updateRental(request, { params });
      const data = await getResponseJson(response);

      expect(response.status).toBe(400);
      expect(data.error).toBe('Rental must be approved/paid to start');
    });
  });

  describe('Step 4: Complete Rental', () => {
    beforeEach(() => {
      mockData.rental = {
        id: 1,
        agent_id: 1,
        renter_id: 'renter-user-id',
        status: 'active',
        pricing_model: 'task',
        agreed_price: 100,
        started_at: new Date(Date.now() - 3600000).toISOString(),
        renter: { id: 'renter-user-id', username: 'tester' },
      };
    });

    it('should allow renter to complete active rental', async () => {
      mockData.user = { id: 'renter-user-id', email: 'renter@example.com' };
      
      const request = createMockRequest('POST', '/api/rentals/1/complete', {});
      const params = createMockParams({ id: '1' });

      const response = await completeRental(request, { params });
      const data = await getResponseJson(response);

      expect(response.status).toBe(200);
      expect(data.review_url).toBe('/rentals/1/review');
    });

    it('should not allow owner to complete rental', async () => {
      mockData.user = { id: 'owner-user-id', email: 'owner@example.com' };
      
      const request = createMockRequest('POST', '/api/rentals/1/complete', {});
      const params = createMockParams({ id: '1' });

      const response = await completeRental(request, { params });
      const data = await getResponseJson(response);

      expect(response.status).toBe(403);
      expect(data.error).toBe('Only renter can complete the rental');
    });

    it('should not allow completing pending rental', async () => {
      mockData.user = { id: 'renter-user-id', email: 'renter@example.com' };
      mockData.rental.status = 'pending';
      
      const request = createMockRequest('POST', '/api/rentals/1/complete', {});
      const params = createMockParams({ id: '1' });

      const response = await completeRental(request, { params });
      const data = await getResponseJson(response);

      expect(response.status).toBe(400);
      expect(data.error).toContain('Cannot complete rental');
    });
  });

  describe('Step 5: Cancel Rental', () => {
    beforeEach(() => {
      mockData.rental = {
        id: 1,
        agent_id: 1,
        renter_id: 'renter-user-id',
        status: 'pending',
        pricing_model: 'task',
        agreed_price: 100,
      };
    });

    it('should allow cancelling pending rental', async () => {
      mockData.user = { id: 'renter-user-id', email: 'renter@example.com' };
      
      const request = createMockRequest('PATCH', '/api/rentals/1', {
        body: { action: 'cancel', reason: 'Changed my mind' },
      });
      const params = createMockParams({ id: '1' });

      const response = await updateRental(request, { params });

      expect(response.status).toBe(200);
      expect(mockData.rental.status).toBe('cancelled');
      expect(mockData.rental.cancellation_reason).toBe('Changed my mind');
    });

    it('should not allow cancelling active rental', async () => {
      mockData.user = { id: 'renter-user-id', email: 'renter@example.com' };
      mockData.rental.status = 'active';
      
      const request = createMockRequest('PATCH', '/api/rentals/1', {
        body: { action: 'cancel' },
      });
      const params = createMockParams({ id: '1' });

      const response = await updateRental(request, { params });
      const data = await getResponseJson(response);

      expect(response.status).toBe(400);
      expect(data.error).toBe('Cannot cancel rental in current status');
    });
  });

  describe('Step 6: Dispute Rental', () => {
    beforeEach(() => {
      mockData.rental = {
        id: 1,
        agent_id: 1,
        renter_id: 'renter-user-id',
        status: 'active',
        pricing_model: 'task',
        agreed_price: 100,
      };
    });

    it('should allow disputing active rental', async () => {
      mockData.user = { id: 'renter-user-id', email: 'renter@example.com' };
      
      const request = createMockRequest('PATCH', '/api/rentals/1', {
        body: { action: 'dispute' },
      });
      const params = createMockParams({ id: '1' });

      const response = await updateRental(request, { params });

      expect(response.status).toBe(200);
      expect(mockData.rental.status).toBe('disputed');
    });

    it('should not allow disputing pending rental', async () => {
      mockData.user = { id: 'renter-user-id', email: 'renter@example.com' };
      mockData.rental.status = 'pending';
      
      const request = createMockRequest('PATCH', '/api/rentals/1', {
        body: { action: 'dispute' },
      });
      const params = createMockParams({ id: '1' });

      const response = await updateRental(request, { params });
      const data = await getResponseJson(response);

      expect(response.status).toBe(400);
      expect(data.error).toBe('Can only dispute active or completed rentals');
    });
  });

  describe('Authorization & Access Control', () => {
    beforeEach(() => {
      mockData.rental = {
        id: 1,
        agent_id: 1,
        renter_id: 'renter-user-id',
        status: 'active',
        pricing_model: 'task',
        agreed_price: 100,
      };
    });

    it('should return 403 for unauthorized rental access', async () => {
      mockData.user = { id: 'other-user-id', email: 'other@example.com' };
      
      const request = createMockRequest('GET', '/api/rentals/1');
      const params = createMockParams({ id: '1' });

      const response = await getRental(request, { params });
      const data = await getResponseJson(response);

      expect(response.status).toBe(403);
      expect(data.error).toBe('Not authorized');
    });

    it('should return 404 for non-existent rental', async () => {
      mockData.user = { id: 'renter-user-id', email: 'renter@example.com' };
      mockData.rental = null;
      
      const request = createMockRequest('GET', '/api/rentals/999');
      const params = createMockParams({ id: '999' });

      const response = await getRental(request, { params });
      const data = await getResponseJson(response);

      expect(response.status).toBe(404);
      expect(data.error).toBe('Rental not found');
    });

    it('should handle invalid action gracefully', async () => {
      mockData.user = { id: 'renter-user-id', email: 'renter@example.com' };
      
      const request = createMockRequest('PATCH', '/api/rentals/1', {
        body: { action: 'invalid_action' },
      });
      const params = createMockParams({ id: '1' });

      const response = await updateRental(request, { params });
      const data = await getResponseJson(response);

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid action');
    });

    it('should allow renter to view their rental', async () => {
      mockData.user = { id: 'renter-user-id', email: 'renter@example.com' };
      
      const request = createMockRequest('GET', '/api/rentals/1');
      const params = createMockParams({ id: '1' });

      const response = await getRental(request, { params });
      const data = await getResponseJson(response);

      expect(response.status).toBe(200);
      expect(data.role).toBe('renter');
    });

    it('should allow owner to view rental of their agent', async () => {
      mockData.user = { id: 'owner-user-id', email: 'owner@example.com' };
      
      const request = createMockRequest('GET', '/api/rentals/1');
      const params = createMockParams({ id: '1' });

      const response = await getRental(request, { params });
      const data = await getResponseJson(response);

      expect(response.status).toBe(200);
      expect(data.role).toBe('owner');
    });
  });

  describe('List Rentals', () => {
    beforeEach(() => {
      mockData.rentals = [
        { id: 1, status: 'active', agent_id: 1 },
        { id: 2, status: 'completed', agent_id: 1 },
      ];
      mockData.agents = [mockData.agent];
    });

    it('should require authentication for listing', async () => {
      mockData.user = null;
      
      const request = createMockRequest('GET', '/api/rentals');

      const response = await listRentals(request);
      expect(response.status).toBe(401);
    });

    it('should list rentals for renter', async () => {
      mockData.user = { id: 'renter-user-id', email: 'renter@example.com' };
      
      const request = createMockRequest('GET', '/api/rentals?role=renter');

      const response = await listRentals(request);
      const data = await getResponseJson(response);

      expect(response.status).toBe(200);
      expect(data.rentals).toBeDefined();
    });

    it('should return empty array when owner has no agents', async () => {
      mockData.user = { id: 'owner-user-id', email: 'owner@example.com' };
      mockData.agents = [];
      
      const request = createMockRequest('GET', '/api/rentals?role=owner');

      const response = await listRentals(request);
      const data = await getResponseJson(response);

      expect(response.status).toBe(200);
      expect(data.rentals).toEqual([]);
    });
  });
});
