import { type SettingsRoleRecordVisibilityRule } from '@/settings/roles/role-permissions/record-visibility/types/SettingsRoleRecordVisibilityRule';
import { TableCell } from '@/ui/layout/table/components/TableCell';
import { TableRow } from '@/ui/layout/table/components/TableRow';
import { styled } from '@linaria/react';
import { Checkbox } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const StyledRuleContent = styled.div`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
`;

const StyledRuleName = styled.span`
  color: ${themeCssVariables.font.color.primary};
  white-space: nowrap;
`;

const StyledRuleDescription = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  overflow: hidden;
  text-overflow: ellipsis;
`;

type SettingsRolePermissionsRecordVisibilityTableRowProps = {
  rule: SettingsRoleRecordVisibilityRule;
  value: boolean;
  isEditable: boolean;
  onChange: (value: boolean) => void;
};

export const SettingsRolePermissionsRecordVisibilityTableRow = ({
  rule,
  value,
  isEditable,
  onChange,
}: SettingsRolePermissionsRecordVisibilityTableRowProps) => {
  const isDisabled = !isEditable;

  const handleRowClick = () => {
    if (isDisabled) return;

    onChange(!value);
  };

  return (
    <TableRow
      onClick={handleRowClick}
      cursor={isDisabled ? 'default' : 'pointer'}
    >
      <TableCell gap={themeCssVariables.spacing[1]}>
        <StyledRuleContent>
          <rule.Icon size={16} />
          <StyledRuleName>{rule.name}</StyledRuleName>
          <StyledRuleDescription>{` · ${rule.description}`}</StyledRuleDescription>
        </StyledRuleContent>
      </TableCell>
      <TableCell
        align="right"
        padding={`0 ${themeCssVariables.spacing[1]} 0 ${themeCssVariables.spacing[2]}`}
        onClick={(e) => e.stopPropagation()}
      >
        <Checkbox
          checked={value}
          onChange={() => onChange(!value)}
          disabled={isDisabled}
        />
      </TableCell>
    </TableRow>
  );
};
