import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../config/env.js', () => ({
  config: {
    nodeUrl: 'https://node.test',
    laravelUrl: 'https://laravel.test',
    editorUrl: 'https://editor.test',
    nodePublicKey: 'test-public-key',
    laravelClientId: '2',
    laravelClientSecret: 'test-secret',
    jwtSecret: 'test-jwt-secret-at-least-32-chars-long',
    komerciaSessionEncryptionKey: 'a'.repeat(64),
    databaseUrl: 'postgresql://test:test@localhost/test',
  },
}));

import { GetStoreInfoTool } from './get-store-info.tool.js';
import type { KomerciaClientInterface } from './get-store-info.tool.js';
import type { ToolRegistry } from '../../mcp/tool.registry.js';
import type { MerchantContext } from '../../auth/merchant-context.js';
import type { Store } from '@komercia-mcp/shared';

const mockMerchantContext: MerchantContext = {
  merchantId: 'merchant-123',
  storeId: 'store-456',
  jti: 'jti-789',
};

const mockStore: Store = {
  id: 'store-456',
  name: 'Test Shop',
  domain: 'https://test-shop.komercia.co',
  plan: 'Pro',
  email: 'owner@test-shop.com',
  created_at: '2024-03-01T00:00:00.000Z',
  active: true,
};

function makeRegistry(): ToolRegistry {
  return {
    register: vi.fn(),
    getAll: vi.fn(),
    find: vi.fn(),
  } as unknown as ToolRegistry;
}

describe('GetStoreInfoTool', () => {
  describe('definition', () => {
    it('has a non-empty name', () => {
      const tool = new GetStoreInfoTool(makeRegistry(), null);
      expect(tool.definition.name).toBe('get_store_info');
    });

    it('has a non-empty description', () => {
      const tool = new GetStoreInfoTool(makeRegistry(), null);
      expect(tool.definition.description).toBeTruthy();
      expect(typeof tool.definition.description).toBe('string');
      expect((tool.definition.description ?? '').length).toBeGreaterThan(20);
    });

    it('has a valid inputSchema with no required params', () => {
      const tool = new GetStoreInfoTool(makeRegistry(), null);
      expect(tool.definition.inputSchema.type).toBe('object');
      expect(tool.definition.inputSchema.required ?? []).toHaveLength(0);
    });
  });

  describe('onModuleInit', () => {
    it('registers itself with the ToolRegistry', () => {
      const registry = makeRegistry();
      const tool = new GetStoreInfoTool(registry, null);
      tool.onModuleInit();
      expect(registry.register).toHaveBeenCalledWith(tool);
    });
  });

  describe('execute', () => {
    describe('when client is available', () => {
      let tool: GetStoreInfoTool;
      let mockClient: KomerciaClientInterface;

      beforeEach(() => {
        mockClient = {
          stores: {
            get: vi.fn().mockResolvedValue(mockStore),
          },
        };
        tool = new GetStoreInfoTool(makeRegistry(), mockClient);
      });

      it('returns formatted store information as text', async () => {
        const result = await tool.execute({}, mockMerchantContext);

        expect(result.content).toHaveLength(1);
        const [item] = result.content;
        expect(item?.type).toBe('text');
        expect(item?.text).toContain('Test Shop');
        expect(item?.text).toContain('Pro');
        expect(item?.text).toContain('owner@test-shop.com');
        expect(item?.text).toContain('Active');
      });

      it('calls the client with the merchant store ID', async () => {
        await tool.execute({}, mockMerchantContext);
        expect(mockClient.stores.get).toHaveBeenCalledWith('store-456');
      });

      it('shows inactive status when store is inactive', async () => {
        const inactiveStore: Store = { ...mockStore, active: false };
        vi.mocked(mockClient.stores.get).mockResolvedValue(inactiveStore);

        const result = await tool.execute({}, mockMerchantContext);
        expect(result.content[0]?.text).toContain('Inactive');
      });
    });

    describe('when client is not available', () => {
      it('returns a placeholder response with the store ID', async () => {
        const tool = new GetStoreInfoTool(makeRegistry(), null);
        const result = await tool.execute({}, mockMerchantContext);

        expect(result.content).toHaveLength(1);
        expect(result.content[0]?.text).toContain('store-456');
        expect(result.content[0]?.text).toContain('placeholder');
      });
    });

    describe('when client throws an error', () => {
      it('returns error text without throwing', async () => {
        const mockClient: KomerciaClientInterface = {
          stores: {
            get: vi.fn().mockRejectedValue(new Error('Network timeout')),
          },
        };
        const tool = new GetStoreInfoTool(makeRegistry(), mockClient);

        const result = await tool.execute({}, mockMerchantContext);

        expect(result.content).toHaveLength(1);
        expect(result.content[0]?.text).toContain('Failed to retrieve store information');
        expect(result.content[0]?.text).toContain('Network timeout');
      });

      it('handles non-Error exceptions gracefully', async () => {
        const mockClient: KomerciaClientInterface = {
          stores: {
            get: vi.fn().mockRejectedValue('string error'),
          },
        };
        const tool = new GetStoreInfoTool(makeRegistry(), mockClient);

        const result = await tool.execute({}, mockMerchantContext);

        expect(result.content[0]?.text).toContain('Failed to retrieve store information');
      });
    });
  });
});
