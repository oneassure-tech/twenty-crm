import { FieldMetadataType } from '@/types/FieldMetadataType';
import { isDefined } from '@/utils';

const isBlank = (value: unknown): boolean =>
  !isDefined(value) ||
  (typeof value === 'string' && value.trim().length === 0) ||
  (Array.isArray(value) && value.length === 0);

const ADDRESS_TEXT_SUB_FIELDS = [
  'addressStreet1',
  'addressStreet2',
  'addressCity',
  'addressState',
  'addressPostcode',
  'addressCountry',
];

// Whether an Ask User Form answer counts as "not answered". Client and server
// both decide this - one to enable Save, the other to refuse a blank required
// answer - so they share this one definition.
//
// Composite fields are why this needs the field type: a cleared link comes
// back as { primaryLinkUrl: '' }, and a phone keeps its country code even when
// no number was typed, so "is the object empty" is the wrong question. Each
// type is judged on the sub-fields a person actually fills in.
export const isUserFormAnswerEmpty = ({
  fieldType,
  answer,
}: {
  fieldType: FieldMetadataType | undefined;
  answer: unknown;
}): boolean => {
  if (isBlank(answer)) {
    return true;
  }

  // 0 and false are real answers.
  if (typeof answer !== 'object' || Array.isArray(answer)) {
    return false;
  }

  const compositeAnswer = answer as Record<string, unknown>;

  switch (fieldType) {
    case FieldMetadataType.LINKS:
      return (
        isBlank(compositeAnswer.primaryLinkUrl) &&
        isBlank(compositeAnswer.secondaryLinks)
      );
    case FieldMetadataType.EMAILS:
      return (
        isBlank(compositeAnswer.primaryEmail) &&
        isBlank(compositeAnswer.additionalEmails)
      );
    case FieldMetadataType.PHONES:
      return (
        isBlank(compositeAnswer.primaryPhoneNumber) &&
        isBlank(compositeAnswer.additionalPhones)
      );
    case FieldMetadataType.CURRENCY:
      // The currency code is preselected, so only the amount says whether
      // anything was answered.
      return isBlank(compositeAnswer.amountMicros);
    case FieldMetadataType.FULL_NAME:
      return (
        isBlank(compositeAnswer.firstName) && isBlank(compositeAnswer.lastName)
      );
    case FieldMetadataType.ADDRESS:
      return ADDRESS_TEXT_SUB_FIELDS.every((subFieldName) =>
        isBlank(compositeAnswer[subFieldName]),
      );
    default:
      return Object.values(compositeAnswer).every(isBlank);
  }
};
