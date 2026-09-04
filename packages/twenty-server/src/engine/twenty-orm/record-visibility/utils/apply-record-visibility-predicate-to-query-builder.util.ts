import {
  Brackets,
  type ObjectLiteral,
  type WhereExpressionBuilder,
} from 'typeorm';

import { GraphqlQueryFilterFieldParser } from 'src/engine/api/graphql/graphql-query-runner/graphql-query-parsers/graphql-query-filter/graphql-query-filter-field.parser';
import { type WorkspaceSelectQueryBuilder } from 'src/engine/twenty-orm/repository/workspace-select-query-builder';
import {
  type RecordVisibilityComparison,
  type RecordVisibilityFieldPredicate,
  type RecordVisibilityPredicate,
} from 'src/engine/twenty-orm/record-visibility/types/record-visibility-predicate.type';

const buildFilterValue = (
  comparison: RecordVisibilityComparison,
): Record<string, unknown> => {
  switch (comparison.operator) {
    case 'equals':
      return { eq: comparison.value };
    case 'isAnyOf':
      return { in: comparison.values };
    case 'isNull':
      return { is: 'NULL' };
  }
};

const buildFieldFilterEntry = (
  predicate: RecordVisibilityFieldPredicate,
): { key: string; value: Record<string, unknown> } => {
  const filterValue = buildFilterValue(predicate.comparison);

  // Composite fields (e.g. ACTOR) must be filtered through the parent field so
  // the parser can resolve the sub-column. Everything else targets the physical
  // column directly, which keeps relation filters on the local join column
  // instead of joining the related table.
  return predicate.subFieldName === undefined
    ? { key: predicate.columnName, value: filterValue }
    : {
        key: predicate.fieldName,
        value: { [predicate.subFieldName]: filterValue },
      };
};

const applyPredicate = ({
  queryBuilder,
  outerQueryBuilder,
  objectNameSingular,
  predicate,
  isFirst,
  fieldParser,
  useDirectTableReference,
}: {
  queryBuilder: WhereExpressionBuilder;
  outerQueryBuilder: WorkspaceSelectQueryBuilder<ObjectLiteral>;
  objectNameSingular: string;
  predicate: RecordVisibilityPredicate;
  isFirst: boolean;
  fieldParser: GraphqlQueryFilterFieldParser;
  useDirectTableReference: boolean;
}): void => {
  switch (predicate.kind) {
    case 'field': {
      const { key, value } = buildFieldFilterEntry(predicate);

      fieldParser.parse(
        queryBuilder,
        outerQueryBuilder,
        objectNameSingular,
        key,
        value,
        isFirst,
        useDirectTableReference,
      );
      break;
    }
    case 'and':
    case 'or': {
      const isOr = predicate.kind === 'or';

      const groupCondition = new Brackets((groupQueryBuilder) => {
        predicate.predicates.forEach((childPredicate, index) => {
          const childCondition = new Brackets((childQueryBuilder) => {
            applyPredicate({
              queryBuilder: childQueryBuilder,
              outerQueryBuilder,
              objectNameSingular,
              predicate: childPredicate,
              isFirst: true,
              fieldParser,
              useDirectTableReference,
            });
          });

          if (index === 0) {
            groupQueryBuilder.where(childCondition);
          } else if (isOr) {
            groupQueryBuilder.orWhere(childCondition);
          } else {
            groupQueryBuilder.andWhere(childCondition);
          }
        });
      });

      if (isFirst) {
        queryBuilder.where(groupCondition);
      } else {
        queryBuilder.andWhere(groupCondition);
      }
      break;
    }
  }
};

export const applyRecordVisibilityPredicateToQueryBuilder = <
  T extends ObjectLiteral,
>({
  queryBuilder,
  objectNameSingular,
  predicate,
  fieldParser,
  useDirectTableReference,
}: {
  queryBuilder: WorkspaceSelectQueryBuilder<T>;
  objectNameSingular: string;
  predicate: RecordVisibilityPredicate;
  fieldParser: GraphqlQueryFilterFieldParser;
  useDirectTableReference: boolean;
}): void => {
  // parse() only uses the join surface of the outer builder, so widen back to
  // ObjectLiteral rather than threading T through every recursive call.
  const outerQueryBuilder =
    queryBuilder as WorkspaceSelectQueryBuilder<ObjectLiteral>;

  // Always wrapped in brackets so a user-supplied top-level OR can never break
  // the restriction apart.
  const whereCondition = new Brackets((innerQueryBuilder) => {
    applyPredicate({
      queryBuilder: innerQueryBuilder,
      outerQueryBuilder,
      objectNameSingular,
      predicate,
      isFirst: true,
      fieldParser,
      useDirectTableReference,
    });
  });

  if (queryBuilder.expressionMap.wheres.length === 0) {
    queryBuilder.where(whereCondition);
  } else {
    queryBuilder.andWhere(whereCondition);
  }
};
