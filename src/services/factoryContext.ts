import { useFactoryStore } from '@/store/factory.store';

/**
 * Get the effective factory_id for service queries.
 * Throws if factory store is not initialized (race condition protection).
 */
export function getFactoryId(): string {
  const store = useFactoryStore.getState();
  const factoryId = store.getEffectiveFactoryId();
  if (!factoryId) {
    throw new Error('Factory not initialized. Ensure user is logged in and factory is selected.');
  }
  return factoryId;
}

/**
 * Get factory code (e.g., 'ALT', 'ALV') for reference number generation.
 */
export function getFactoryCode(): string {
  const store = useFactoryStore.getState();
  const factory = store.viewingFactory ?? store.activeFactory;
  if (!factory) {
    throw new Error('Factory not initialized.');
  }
  return factory.factory_code;
}
