# TODO: Update Inbound Service for Multi-Factory Support

## Tasks

- [x] Add imports (getFactoryId, getFactoryCode, getInventoryByPartIdAndFactory)
- [x] Update generateInboundReferenceNumber to include factory code
- [x] Update adjustInventoryQuantity to use factory-aware inventory lookup
- [x] Update createInbound to include factory_id
- [x] Update getAllInbound to filter by factory_id
- [x] Update getInboundByDateRange to filter by factory_id
- [x] Update getInboundByPartId to filter by factory_id
- [x] Update getInboundBySupplierId to filter by factory_id
- [x] Update getRecentInbound to filter by factory_id
- [x] Update getLast7DaysInboundAmount to filter by factory_id
- [x] Update getInboundAmountByPeriod to filter by factory_id
- [x] Update getInboundStats to filter by factory_id
- [x] Verify all changes
