import { Header } from '@/components/Header';
import { Hero } from '@/components/Hero';
import { FeatureGrid } from '@/components/FeatureGrid';
import { HowItWorks } from '@/components/HowItWorks';
import { BenefitsSection } from '@/components/BenefitsSection';
import { CallToAction } from '@/components/CallToAction';
import { Footer } from '@/components/Footer';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white">
      <Header />
      <main className="flex-1">
        <Hero />
        <FeatureGrid />
        <HowItWorks />
        <BenefitsSection />
        <CallToAction />
      </main>
      <Footer />
    </div>
  );
}
