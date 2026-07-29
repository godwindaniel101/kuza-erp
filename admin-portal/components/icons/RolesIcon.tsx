import IconBase, { IconProps } from './IconBase';

export function RolesIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3Z" />
      <path d="M9 12l2 2 4-4" />
    </IconBase>
  );
}

export default RolesIcon;
