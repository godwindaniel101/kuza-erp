import IconBase, { IconProps } from './IconBase';

export function AttendanceIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
      <path d="M3.5 9.5h17" />
      <path d="M8 3v3" />
      <path d="M16 3v3" />
      <path d="M9 14.5l2 2 4-4" />
    </IconBase>
  );
}

export default AttendanceIcon;
