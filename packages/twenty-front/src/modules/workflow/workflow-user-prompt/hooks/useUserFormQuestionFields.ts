import { objectMetadataItemsSelector } from '@/object-metadata/states/objectMetadataItemsSelector';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { type PendingUserPromptQuestion } from '@/workflow/workflow-user-prompt/types/PendingUserPrompt';
import {
  getUserFormQuestionFields,
  type UserFormQuestionField,
} from '@/workflow/workflow-user-prompt/utils/getUserFormQuestionFields';
import { useMemo } from 'react';

export const useUserFormQuestionFields = ({
  objectNameSingular,
  questions,
}: {
  objectNameSingular: string;
  questions: PendingUserPromptQuestion[];
}): UserFormQuestionField[] => {
  const objectMetadataItems = useAtomStateValue(objectMetadataItemsSelector);

  return useMemo(
    () =>
      getUserFormQuestionFields({
        objectNameSingular,
        questions,
        objectMetadataItems,
      }),
    [objectNameSingular, questions, objectMetadataItems],
  );
};
