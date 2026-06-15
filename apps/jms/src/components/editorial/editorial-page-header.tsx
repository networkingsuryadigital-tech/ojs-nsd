type EditorialPageHeaderProps = {
  title: string;
  description?: string;
};

export function EditorialPageHeader({ title, description }: EditorialPageHeaderProps) {
  return (
    <header>
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {description ? (
        <p className="mt-1 text-sm text-foreground/60">{description}</p>
      ) : null}
    </header>
  );
}
