import dynamic from 'next/dynamic';
import HeroSection from "./components/landing/HeroSection";
import { Suspense } from "react";

// Lazy load non-critical sections with loading fallbacks
const FeaturesSection = dynamic(() => import('./components/landing/FeaturesSection'), {
    loading: () => <div className="h-96 animate-pulse bg-gray-900" />
});
const IntegrationsSection = dynamic(() => import('./components/landing/IntegrationsSection'), {
    loading: () => <div className="h-64 animate-pulse bg-gray-900" />
});
const HowItWorksSection = dynamic(() => import('@/app/components/landing/HowItWorksSection'), {
    loading: () => <div className="h-96 animate-pulse bg-gray-900" />
});
const StatsSection = dynamic(() => import('@/app/components/landing/StatsSection'), {
    loading: () => <div className="h-48 animate-pulse bg-gray-900" />
});
const MoreFeaturesSection = dynamic(() => import('@/app/components/landing/MoreFeaturesSection'), {
    loading: () => <div className="h-64 animate-pulse bg-gray-900" />
});
const CTASection = dynamic(() => import('@/app/components/landing/CTASection'), {
    loading: () => <div className="h-64 animate-pulse bg-gray-900" />
});
const Footer = dynamic(() => import('@/app/components/landing/Footer'), {
    loading: () => <div className="h-32 animate-pulse bg-gray-900" />
});

// Skeleton loading component
function SectionLoader({ height = "h-64" }: { height?: string }) {
    return <div className={`${height} animate-pulse bg-gray-900/50`} />;
}

export default function Home() {
    return (
        <div className="min-h-screen bg-black">
            <HeroSection />

            <Suspense fallback={<SectionLoader height="h-96" />}>
                <FeaturesSection />
            </Suspense>

            <Suspense fallback={<SectionLoader height="h-64" />}>
                <IntegrationsSection />
            </Suspense>

            <Suspense fallback={<SectionLoader height="h-96" />}>
                <HowItWorksSection />
            </Suspense>

            <Suspense fallback={<SectionLoader height="h-48" />}>
                <StatsSection />
            </Suspense>

            <Suspense fallback={<SectionLoader height="h-64" />}>
                <MoreFeaturesSection />
            </Suspense>

            <Suspense fallback={<SectionLoader height="h-64" />}>
                <CTASection />
            </Suspense>

            <Suspense fallback={<SectionLoader height="h-32" />}>
                <Footer />
            </Suspense>
        </div>
    );
}
