import { QueryRunner } from 'typeorm';

import { RegisteredInstanceCommand } from 'src/engine/core-modules/upgrade/decorators/registered-instance-command.decorator';
import { FastInstanceCommand } from 'src/engine/core-modules/upgrade/interfaces/fast-instance-command.interface';

@RegisteredInstanceCommand('2.20.0', 1783527065000)
export class AddOwnedRecordsRestrictionToRoleAndObjectPermissionFastInstanceCommand
  implements FastInstanceCommand
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Defaults false so every existing role keeps its current behaviour.
    await queryRunner.query(
      'ALTER TABLE "core"."role" ADD "canOnlyAccessOwnedObjectRecords" boolean NOT NULL DEFAULT false',
    );

    // Nullable: null leaves the object unrestricted for this role.
    await queryRunner.query(
      'ALTER TABLE "core"."objectPermission" ADD "ownerFieldMetadataId" uuid',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "core"."objectPermission" DROP COLUMN "ownerFieldMetadataId"',
    );

    await queryRunner.query(
      'ALTER TABLE "core"."role" DROP COLUMN "canOnlyAccessOwnedObjectRecords"',
    );
  }
}
