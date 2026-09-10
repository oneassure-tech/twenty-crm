import { type EnrichedObjectMetadataItem } from '@/object-metadata/types/EnrichedObjectMetadataItem';
import { formatFieldMetadataItemAsFieldDefinition } from '@/object-metadata/utils/formatFieldMetadataItemAsFieldDefinition';
import { type FieldDefinition } from '@/object-record/record-field/ui/types/FieldDefinition';
import { type FieldMetadata } from '@/object-record/record-field/ui/types/FieldMetadata';
import { type PendingUserPromptQuestion } from '@/workflow/workflow-user-prompt/types/PendingUserPrompt';
import { isDefined } from 'twenty-shared/utils';

export type UserFormQuestionField = {
  question: PendingUserPromptQuestion;
  fieldDefinition: FieldDefinition<FieldMetadata>;
};

// A question is only answerable while the field it writes to still exists, so
// the field lookup happens once here and both the inputs and the "can I save
// this?" check work off the same resolved list.
export const getUserFormQuestionFields = ({
  objectNameSingular,
  questions,
  objectMetadataItems,
}: {
  objectNameSingular: string;
  questions: PendingUserPromptQuestion[];
  objectMetadataItems: EnrichedObjectMetadataItem[];
}): UserFormQuestionField[] => {
  const objectMetadataItem = objectMetadataItems.find(
    (item) => item.nameSingular === objectNameSingular,
  );

  if (!isDefined(objectMetadataItem)) {
    return [];
  }

  return questions.flatMap((question) => {
    const fieldMetadataItem = objectMetadataItem.fields.find(
      (field) => field.name === question.fieldName,
    );

    if (!isDefined(fieldMetadataItem)) {
      return [];
    }

    return [
      {
        question,
        fieldDefinition: formatFieldMetadataItemAsFieldDefinition({
          field: fieldMetadataItem,
          objectMetadataItem,
        }),
      },
    ];
  });
};
