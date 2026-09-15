/**
 * A stylesheet link that can start out disabled.
 *
 * Wallos ships each theme as a separate file and switches themes by toggling
 * `link.disabled`. `disabled` is a valid attribute on `<link>` but is missing
 * from React's typings, hence the cast.
 */
type LinkProps = React.DetailedHTMLProps<React.LinkHTMLAttributes<HTMLLinkElement>, HTMLLinkElement>;

export function Stylesheet({
  href,
  id,
  disabled,
}: {
  href: string;
  id?: string;
  disabled?: boolean;
}) {
  const props = { rel: 'stylesheet', href, id, disabled } as unknown as LinkProps;
  return <link {...props} />;
}
