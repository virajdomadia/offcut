import type { Metadata } from "next";
import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";

export const metadata: Metadata = { title: "Page not found — Offcut" };

export default function NotFound() {
  return (
    <>
      <Header />
      <main id="main" tabIndex={-1} className="wrap nf">
        <p className="nf-code" aria-hidden="true">4<span>04</span></p>
        <h1>Sold out. Or never cut.</h1>
        <p>Nothing lives at this address. The current drop is on the home page.</p>
        <a className="btn btn-fill" href="/">Back to Offcut</a>
      </main>
      <Footer />
    </>
  );
}
