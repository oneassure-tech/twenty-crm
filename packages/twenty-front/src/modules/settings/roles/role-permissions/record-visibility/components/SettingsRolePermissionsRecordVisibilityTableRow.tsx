import { type SettingsRoleRecordVisibilityRule } from '@/settings/roles/role-permissions/record-visibility/types/SettingsRoleRecordVisibilityRule';
import { TableCell } from '@/ui/layout/table/components/TableCell';
import { TableRow } from '@/ui/layout/table/components/TableRow';
import { styled } from '@linaria/react';
import { useContext } from 'react';
import { Checkbox } from 'twenty-ui/input';
import { ThemeContext, themeCssVariables } from 'twenty-ui/theme-constants';

const StyledName = styled.span`
  color: ${themeCssVariables.font.color.primary};
`;

const StyledDescription = styled.span`
  color: ${themeCssVariables.font.color.secondary};
`;

const StyledIconContainer = styled.div`
  align-items: center;
  display: flex;
  justify-content: center;
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
  const { theme } = useContext(ThemeContext);
  const isDisabled = !isEditable;

  const handleRowClick = () => {
    if (isDisabled) return;

    onChange(!value);
  };

  return (
    <TableRow
      gridAutoColumns="3fr 4fr 24px"
      onClick={handleRowClick}
      cursor={isDisabled ? 'default' : 'pointer'}
    >
      <TableCell gap={themeCssVariables.spacing[2]}>
        <StyledIconContainer>
          <rule.Icon
            size={theme.icon.size.md}
            color={theme.font.color.primary}
            stroke={theme.icon.stroke.sm}
          />
        </StyledIconContainer>
        <StyledName>{rule.name}</StyledName>
      </TableCell>
      <TableCell gap={themeCssVariables.spacing[2]}>
        <StyledDescription>{rule.description}</StyledDescription>
      </TableCell>
      <TableCell
        align="right"
        padding={`0 ${themeCssVariables.spacing[1]} 0 ${themeCssVariables.spacing[2]}`}
        onClick={(e) => e.stopPropagation()}
      >
        <Checkbox
          checked={value}
          disabled={isDisabled}
          onChange={(event) => onChange(event.target.checked)}
        />
      </TableCell>
    </TableRow>
  );
};
