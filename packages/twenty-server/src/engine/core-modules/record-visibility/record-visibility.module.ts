import { Module } from '@nestjs/common';

import { RecordVisibilityOwnerCreateManyPreQueryHook } from 'src/engine/core-modules/record-visibility/query-hooks/record-visibility-owner.create-many.pre-query-hook';
import { RecordVisibilityOwnerCreateOnePreQueryHook } from 'src/engine/core-modules/record-visibility/query-hooks/record-visibility-owner.create-one.pre-query-hook';
import { RecordVisibilityOwnerDefaultingService } from 'src/engine/core-modules/record-visibility/services/record-visibility-owner-defaulting.service';
import { WorkspaceCacheModule } from 'src/engine/workspace-cache/workspace-cache.module';

@Module({
  imports: [WorkspaceCacheModule],
  providers: [
    RecordVisibilityOwnerCreateOnePreQueryHook,
    RecordVisibilityOwnerCreateManyPreQueryHook,
    RecordVisibilityOwnerDefaultingService,
  ],
  exports: [
    RecordVisibilityOwnerCreateOnePreQueryHook,
    RecordVisibilityOwnerCreateManyPreQueryHook,
    RecordVisibilityOwnerDefaultingService,
  ],
})
export class RecordVisibilityModule {}
