import { FieldType } from 'twenty-sdk/define';

type SystemFieldIdentifiers = {
  id: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string;
  createdBy: string;
  updatedBy: string;
  position: string;
  searchVector: string;
};

export const systemFields = (identifiers: SystemFieldIdentifiers) =>
  [
    {
      universalIdentifier: identifiers.id,
      type: FieldType.UUID,
      name: 'id',
      label: 'Id',
      description: 'Id',
      icon: 'Icon123',
      isNullable: false,
      defaultValue: 'uuid',
    },
    {
      universalIdentifier: identifiers.createdAt,
      type: FieldType.DATE_TIME,
      name: 'createdAt',
      label: 'Creation date',
      description: 'Creation date',
      icon: 'IconCalendar',
      isNullable: false,
      defaultValue: 'now',
    },
    {
      universalIdentifier: identifiers.updatedAt,
      type: FieldType.DATE_TIME,
      name: 'updatedAt',
      label: 'Last update',
      description: 'Last time the record was changed',
      icon: 'IconCalendarClock',
      isNullable: false,
      defaultValue: 'now',
    },
    {
      universalIdentifier: identifiers.deletedAt,
      type: FieldType.DATE_TIME,
      name: 'deletedAt',
      label: 'Deleted at',
      description: 'Deletion date',
      icon: 'IconCalendarClock',
      isNullable: true,
      defaultValue: null,
    },
    {
      universalIdentifier: identifiers.createdBy,
      type: FieldType.ACTOR,
      name: 'createdBy',
      label: 'Created by',
      description: 'The creator of the record',
      icon: 'IconCreativeCommonsSa',
      isNullable: false,
      defaultValue: { name: "''", source: "'MANUAL'" },
    },
    {
      universalIdentifier: identifiers.updatedBy,
      type: FieldType.ACTOR,
      name: 'updatedBy',
      label: 'Updated by',
      description: 'The workspace member who last updated the record',
      icon: 'IconUserCircle',
      isNullable: false,
      defaultValue: { name: "''", source: "'MANUAL'" },
    },
    {
      universalIdentifier: identifiers.position,
      type: FieldType.POSITION,
      name: 'position',
      label: 'Position',
      description: 'Position',
      icon: 'IconHierarchy2',
      isNullable: false,
      defaultValue: 0,
    },
    {
      universalIdentifier: identifiers.searchVector,
      type: FieldType.TS_VECTOR,
      name: 'searchVector',
      label: 'Search vector',
      description: 'Search vector',
      icon: 'IconSearch',
      isNullable: true,
      defaultValue: null,
    },
  ] as const;
