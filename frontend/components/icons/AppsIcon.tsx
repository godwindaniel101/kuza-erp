import IconBase, { IconProps } from './IconBase';

export function AppsIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="6" cy="6" r="1.4" />
      <circle cx="12" cy="6" r="1.4" />
      <circle cx="18" cy="6" r="1.4" />
      <circle cx="6" cy="12" r="1.4" />
      <circle cx="12" cy="12" r="1.4" />
      <circle cx="18" cy="12" r="1.4" />
      <circle cx="6" cy="18" r="1.4" />
      <circle cx="12" cy="18" r="1.4" />
      <circle cx="18" cy="18" r="1.4" />
    </IconBase>
  );
}

export default AppsIcon;
