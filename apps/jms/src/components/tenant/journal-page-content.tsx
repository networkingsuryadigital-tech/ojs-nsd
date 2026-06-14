import Markdown from "react-markdown";

type JournalPageContentProps = {
  content: string;
};

export function JournalPageContent({ content }: JournalPageContentProps) {
  return (
    <article className="prose prose-neutral max-w-none dark:prose-invert prose-p:leading-relaxed prose-headings:scroll-mt-20">
      <Markdown>{content}</Markdown>
    </article>
  );
}
