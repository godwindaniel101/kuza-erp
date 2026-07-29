import IconBase, { IconProps } from './IconBase';

export function ChartOfAccountsIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="9" y="3" width="6" height="4" rx="1.5" />
      <rect x="3" y="16" width="6" height="4" rx="1.5" />
      <rect x="15" y="16" width="6" height="4" rx="1.5" />
      <path d="M12 7v6" />
      <path d="M6 16v-3h12v3" />
    </IconBase>
  );
}

export default ChartOfAccountsIcon;
