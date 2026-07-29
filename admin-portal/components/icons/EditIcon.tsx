import IconBase, { IconProps } from './IconBase';

export function EditIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4.5 20 5.5 16 16 5.5a2.12 2.12 0 0 1 3 3L8.5 19l-4 1Z" />
      <path d="M14 7.5l3 3" />
    </IconBase>
  );
}

export default EditIcon;
