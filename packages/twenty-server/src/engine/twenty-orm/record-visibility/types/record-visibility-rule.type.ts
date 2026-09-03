import {
  type RecordVisibilityRuleConfig,
  type RecordVisibilityRuleKey,
} from 'twenty-shared/types';

import { type FlatEntityMaps } from 'src/engine/metadata-modules/flat-entity/types/flat-entity-maps.type';
import { type FlatFieldMetadata } from 'src/engine/metadata-modules/flat-field-metadata/types/flat-field-metadata.type';
import { type FlatObjectMetadata } from 'src/engine/metadata-modules/flat-object-metadata/types/flat-object-metadata.type';
import { type RecordVisibilityPredicate } from 'src/engine/twenty-orm/record-visibility/types/record-visibility-predicate.type';

export type RecordVisibilityRuleResult =
  // This rule does not constrain the current object for the current principal.
  | { kind: 'unrestricted' }
  // The rule applies but cannot be satisfied - match nothing rather than
  // silently falling open.
  | { kind: 'denyAll' }
  | { kind: 'predicate'; predicate: RecordVisibilityPredicate };

// Deliberately narrower than WorkspaceInternalContext: the subscription
// publisher enforces the same rules without an ORM context, so rules may only
// depend on what both call sites can supply.
export type RecordVisibilityRuleContext = {
  objectMetadata: FlatObjectMetadata;
  flatObjectMetadataMaps: FlatEntityMaps<FlatObjectMetadata>;
  flatFieldMetadataMaps: FlatEntityMaps<FlatFieldMetadata>;
  // The acting workspace member, or undefined for non-user principals
  // (api key, application, system).
  workspaceMemberId: string | undefined;
  config: RecordVisibilityRuleConfig;
};

export type RecordVisibilityRule = {
  key: RecordVisibilityRuleKey;
  build: (context: RecordVisibilityRuleContext) => RecordVisibilityRuleResult;
};
