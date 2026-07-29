import IconBase, { IconProps } from './IconBase';

export function SettingsIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M21.09 10.56 21.09 13.44 18.28 14.6 19.44 17.41 17.41 19.44 14.6 18.28 13.44 21.09 10.56 21.09 9.4 18.28 6.59 19.44 4.56 17.41 5.72 14.6 2.91 13.44 2.91 10.56 5.72 9.4 4.56 6.59 6.59 4.56 9.4 5.72 10.56 2.91 13.44 2.91 14.6 5.72 17.41 4.56 19.44 6.59 18.28 9.4Z" />
      <circle cx="12" cy="12" r="3" />
    </IconBase>
  );
}

export default SettingsIcon;
