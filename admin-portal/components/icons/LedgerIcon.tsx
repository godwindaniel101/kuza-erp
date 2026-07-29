import IconBase, { IconProps } from './IconBase';

export function LedgerIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M6 4a2 2 0 0 1 2-2h10v16H8a2 2 0 0 0-2 2Z" />
      <path d="M6 20a2 2 0 0 1 2-2h10" />
      <path d="M13 2v6l2-1.4L17 8V2" />
    </IconBase>
  );
}

export default LedgerIcon;
