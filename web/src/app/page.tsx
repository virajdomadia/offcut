import type { Metadata } from "next";
import { Header } from "@/components/landing/Header";
import { Hero } from "@/components/landing/Hero";
import { Marq } from "@/components/landing/Marq";
import { New } from "@/components/landing/New";
import { Look } from "@/components/landing/Look";
import { Ops } from "@/components/landing/Ops";
import { Cta } from "@/components/landing/Cta";
import { EarlyAccess } from "@/components/landing/EarlyAccess";
import { Footer } from "@/components/landing/Footer";

export const metadata: Metadata = { alternates: { canonical: "/" } };

export default function Home() {
  return (
    <>
      <Header />
      <main id="main" tabIndex={-1}>
        <Hero />
        <Marq />
        <New />
        <Look />
        <Ops />
        <Cta />
        <EarlyAccess />
      </main>
      <Footer />
    </>
  );
}
