import { site } from "@/lib/site";

export function Footer() {
  return (
    <footer className="wrap foot">
      <span>Offcut · a portfolio project by <a href={site.authorUrl}>{site.author}</a></span>
      <span>offcut.virajdomadia.com</span>
    </footer>
  );
}
