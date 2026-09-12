import { Header } from "@/components/landing/Header";
import { Hero } from "@/components/landing/Hero";
import { Marq } from "@/components/landing/Marq";
import { New } from "@/components/landing/New";
import { Look } from "@/components/landing/Look";
import { Ops } from "@/components/landing/Ops";
import { Cta } from "@/components/landing/Cta";
import { Footer } from "@/components/landing/Footer";

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <Marq />
        <New />
        <Look />
        <Ops />
        <Cta />
      </main>
      <Footer />
    </>
  );
}
