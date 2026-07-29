import IconBase, { IconProps } from './IconBase';

export function ReportIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M7 3h7l4 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
      <path d="M14 3v4h4" />
      <path d="M9.5 16v-3M12 16v-5.5M14.5 16v-2" />
    </IconBase>
  );
}

export default ReportIcon;
