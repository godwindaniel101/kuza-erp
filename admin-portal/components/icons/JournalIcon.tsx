import IconBase, { IconProps } from './IconBase';

export function JournalIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 6.5C10 5 7.5 4.5 4 5v13c3.5-.5 6 0 8 1.5" />
      <path d="M12 6.5C14 5 16.5 4.5 20 5v13c-3.5-.5-6 0-8 1.5" />
      <path d="M12 6.5v13" />
    </IconBase>
  );
}

export default JournalIcon;
