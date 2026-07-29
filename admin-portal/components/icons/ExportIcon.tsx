import IconBase, { IconProps } from './IconBase';

export function ExportIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
      <path d="M12 15V4" />
      <path d="M8 8l4-4 4 4" />
    </IconBase>
  );
}

export default ExportIcon;
