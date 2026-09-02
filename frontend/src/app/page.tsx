import { Header } from '@/components/Header';
import { Hero } from '@/components/Hero';
import { SystemStatus } from '@/components/SystemStatus';
import { FeatureGrid } from '@/components/FeatureGrid';
import { ArchitecturePreview } from '@/components/ArchitecturePreview';
import { Footer } from '@/components/Footer';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 selection:bg-blue-500 selection:text-white">
      <Header />
      <main className="flex-1">
        <Hero />
        <SystemStatus />
        <FeatureGrid />
        <ArchitecturePreview />
      </main>
      <Footer />
    </div>
  );
}
