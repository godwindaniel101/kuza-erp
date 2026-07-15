import IconBase, { IconProps } from './IconBase';

export function LogoutIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M15 5V4a1 1 0 0 0-1-1H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-1" />
      <path d="M10 12h11" />
      <path d="M18 9l3 3-3 3" />
    </IconBase>
  );
}

export default LogoutIcon;
