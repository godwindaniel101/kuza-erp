import IconBase, { IconProps } from './IconBase';

export function DashboardIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="3.5" y="3.5" width="7" height="7" rx="2" />
      <rect x="13.5" y="3.5" width="7" height="5" rx="2" />
      <rect x="13.5" y="11.5" width="7" height="9" rx="2" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="2" />
    </IconBase>
  );
}

export default DashboardIcon;
