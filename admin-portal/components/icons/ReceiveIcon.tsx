import IconBase, { IconProps } from './IconBase';

export function ReceiveIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M20 12v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-5" />
      <path d="M4 12h4l1 2h6l1-2h4" />
      <path d="M12 3v8" />
      <path d="M8.5 8 12 11.5 15.5 8" />
    </IconBase>
  );
}

export default ReceiveIcon;
