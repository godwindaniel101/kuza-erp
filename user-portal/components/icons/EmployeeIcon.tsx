import IconBase, { IconProps } from './IconBase';

export function EmployeeIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="3.5" y="5" width="17" height="14" rx="2.5" />
      <circle cx="8.5" cy="11" r="2" />
      <path d="M5.5 16a3 3 0 0 1 6 0" />
      <path d="M14 10.5h4" />
      <path d="M14 13.5h3" />
    </IconBase>
  );
}

export default EmployeeIcon;
