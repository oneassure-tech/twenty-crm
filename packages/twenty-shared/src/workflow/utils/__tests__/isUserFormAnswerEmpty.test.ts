import { FieldMetadataType } from '@/types/FieldMetadataType';
import { isUserFormAnswerEmpty } from '@/workflow/utils/isUserFormAnswerEmpty';

describe('isUserFormAnswerEmpty', () => {
  it.each([undefined, null, '', '   ', []])(
    'should treat %p as empty whatever the field type',
    (answer) => {
      expect(
        isUserFormAnswerEmpty({ fieldType: FieldMetadataType.TEXT, answer }),
      ).toBe(true);
    },
  );

  it.each([
    [FieldMetadataType.NUMBER, 0],
    [FieldMetadataType.BOOLEAN, false],
    [FieldMetadataType.TEXT, 'Tuesday'],
    [FieldMetadataType.MULTI_SELECT, ['OPTION_A']],
  ])('should treat a %s answer of %p as answered', (fieldType, answer) => {
    expect(isUserFormAnswerEmpty({ fieldType, answer })).toBe(false);
  });

  it('should treat a cleared link as empty', () => {
    expect(
      isUserFormAnswerEmpty({
        fieldType: FieldMetadataType.LINKS,
        answer: {
          primaryLinkUrl: '',
          primaryLinkLabel: '',
          secondaryLinks: [],
        },
      }),
    ).toBe(true);
  });

  it('should treat a link with a url as answered', () => {
    expect(
      isUserFormAnswerEmpty({
        fieldType: FieldMetadataType.LINKS,
        answer: { primaryLinkUrl: 'oneassure.in', primaryLinkLabel: '' },
      }),
    ).toBe(false);
  });

  it('should treat a phone with only its country code as empty', () => {
    expect(
      isUserFormAnswerEmpty({
        fieldType: FieldMetadataType.PHONES,
        answer: {
          primaryPhoneNumber: '',
          primaryPhoneCountryCode: 'IN',
          primaryPhoneCallingCode: '+91',
        },
      }),
    ).toBe(true);
  });

  it('should treat a currency with only its code as empty', () => {
    expect(
      isUserFormAnswerEmpty({
        fieldType: FieldMetadataType.CURRENCY,
        answer: { amountMicros: null, currencyCode: 'INR' },
      }),
    ).toBe(true);
  });

  it('should treat a zero amount as answered', () => {
    expect(
      isUserFormAnswerEmpty({
        fieldType: FieldMetadataType.CURRENCY,
        answer: { amountMicros: 0, currencyCode: 'INR' },
      }),
    ).toBe(false);
  });

  it('should treat a full name with only a first name as answered', () => {
    expect(
      isUserFormAnswerEmpty({
        fieldType: FieldMetadataType.FULL_NAME,
        answer: { firstName: 'Sarthak', lastName: '' },
      }),
    ).toBe(false);
  });

  it('should ignore coordinates when judging an address', () => {
    expect(
      isUserFormAnswerEmpty({
        fieldType: FieldMetadataType.ADDRESS,
        answer: {
          addressStreet1: '',
          addressStreet2: null,
          addressCity: '',
          addressState: '',
          addressPostcode: '',
          addressCountry: '',
          addressLat: 0,
          addressLng: 0,
        },
      }),
    ).toBe(true);
  });

  it('should treat an email list with an additional email as answered', () => {
    expect(
      isUserFormAnswerEmpty({
        fieldType: FieldMetadataType.EMAILS,
        answer: { primaryEmail: '', additionalEmails: ['ops@oneassure.in'] },
      }),
    ).toBe(false);
  });
});
