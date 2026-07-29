import IconBase, { IconProps } from './IconBase';

export function LeaveIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
      <path d="M3.5 9.5h17" />
      <path d="M8 3v3" />
      <path d="M16 3v3" />
      <path d="M10 13l4 4" />
      <path d="M14 13l-4 4" />
    </IconBase>
  );
}

export default LeaveIcon;
