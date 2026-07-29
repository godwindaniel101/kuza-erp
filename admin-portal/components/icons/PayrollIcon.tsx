import IconBase, { IconProps } from './IconBase';

export function PayrollIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="3" y="6" width="18" height="12" rx="2.5" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M6 9.5h.01" />
      <path d="M18 14.5h.01" />
    </IconBase>
  );
}

export default PayrollIcon;
