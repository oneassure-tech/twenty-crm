import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

import { ObjectMetadataEntity } from 'src/engine/metadata-modules/object-metadata/object-metadata.entity';
import { RoleEntity } from 'src/engine/metadata-modules/role/role.entity';
import { SyncableEntity } from 'src/engine/workspace-manager/types/syncable-entity.interface';

@Entity('objectPermission')
@Unique('IDX_OBJECT_PERMISSION_OBJECT_METADATA_ID_ROLE_ID_UNIQUE', [
  'objectMetadataId',
  'roleId',
])
@Index('IDX_OBJECT_PERMISSION_WORKSPACE_ID_ROLE_ID', ['workspaceId', 'roleId'])
export class ObjectPermissionEntity extends SyncableEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: false, type: 'uuid' })
  roleId: string;

  @ManyToOne(() => RoleEntity, (role) => role.objectPermissions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'roleId' })
  role: Relation<RoleEntity>;

  @Column({ nullable: false, type: 'uuid' })
  objectMetadataId: string;

  @ManyToOne(
    () => ObjectMetadataEntity,
    (objectMetadata) => objectMetadata.objectPermissions,
    {
      onDelete: 'CASCADE',
    },
  )
  @JoinColumn({ name: 'objectMetadataId' })
  objectMetadata: Relation<ObjectMetadataEntity>;

  @Column({ nullable: true, type: 'boolean' })
  canReadObjectRecords?: boolean;

  @Column({ nullable: true, type: 'boolean' })
  canUpdateObjectRecords?: boolean;

  @Column({ nullable: true, type: 'boolean' })
  canSoftDeleteObjectRecords?: boolean;

  @Column({ nullable: true, type: 'boolean' })
  canDestroyObjectRecords?: boolean;

  // Field metadata id of the MANY_TO_ONE relation to workspaceMember that
  // designates record ownership. Only read when the role has
  // canOnlyAccessOwnedObjectRecords set; null leaves this object unrestricted.
  //
  // Held as a plain uuid rather than a relation: registering a new many-to-one
  // here would require threading it through the metadata migration engine, and
  // a dangling id already resolves to "unrestricted" in resolveOwnerColumnName.
  @Column({ nullable: true, type: 'uuid' })
  ownerFieldMetadataId?: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
