"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { ConnectButton, useActiveAccount } from "thirdweb/react";
import { client } from "./client";
import { GiftWizard } from "../components/GiftWizard";
import { HeroSection } from "../components/HeroSection";
import { FeatureSection } from "../components/FeatureSection";
import { StatsSection } from "../components/StatsSection";
import { ReferralWelcomeBanner } from "../components/ReferralWelcomeBanner";

export default function Home() {
  const [showWizard, setShowWizard] = useState(false);
  const [referrer, setReferrer] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [showWelcomeBanner, setShowWelcomeBanner] = useState(false);
  const searchParams = useSearchParams();
  const account = useActiveAccount();

  useEffect(() => {
    setMounted(true);
    
    // Check for referral parameter
    const ref = searchParams?.get("ref");
    if (ref) {
      setReferrer(ref);
      // Store in localStorage for later use
      localStorage.setItem("referrer", ref);
      
      // Show welcome banner for referred users
      const hasSeenBanner = localStorage.getItem(`referral-banner-${ref}`);
      if (!hasSeenBanner) {
        setShowWelcomeBanner(true);
      }
      
      // Track referral click in real-time
      trackReferralClick(ref);
    } else {
      // Check localStorage for existing referrer
      const storedRef = localStorage.getItem("referrer");
      if (storedRef) {
        setReferrer(storedRef);
      }
    }
  }, [searchParams]);

  // Function to track referral clicks
  const trackReferralClick = async (referrerAddress: string) => {
    try {
      console.log('🔗 Tracking referral click for:', referrerAddress);
      
      const response = await fetch('/api/referrals/track-click', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          referrerAddress,
          userAgent: navigator.userAgent,
          source: 'direct' // Can be enhanced to detect actual source
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Referral click tracked successfully:', result);
      } else {
        console.warn('⚠️ Failed to track referral click:', response.statusText);
      }
    } catch (error) {
      console.error('❌ Error tracking referral click:', error);
      // Don't throw error to avoid disrupting user experience
    }
  };

  // Auto-upgrade IP-based account when user connects wallet
  useEffect(() => {
    if (account?.address && mounted) {
      upgradeIPAccount(account.address);
    }
  }, [account?.address, mounted]);

  const upgradeIPAccount = async (userAddress: string) => {
    try {
      console.log('🔄 Attempting to upgrade IP-based account for connected wallet');
      
      const response = await fetch('/api/referrals/upgrade-ip-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userAddress
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ IP account upgrade successful:', result);
      } else {
        console.warn('⚠️ IP account upgrade failed:', response.statusText);
      }
    } catch (error) {
      console.error('❌ Error upgrading IP account:', error);
      // Don't throw error to avoid disrupting user experience
    }
  };

  const handleCreateGift = () => {
    setShowWizard(true);
  };

  const handleCloseBanner = () => {
    setShowWelcomeBanner(false);
    // Mark this referrer's banner as seen
    if (referrer) {
      localStorage.setItem(`referral-banner-${referrer}`, 'seen');
    }
  };

  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <HeroSection onCreateGift={handleCreateGift} />

      {/* Features Section */}
      <FeatureSection />

      {/* Stats Section */}
      <StatsSection />

      {/* How it Works Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16 text-gray-800">
            ¿Cómo funciona?
          </h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold text-xl">1</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Sube tu Arte</h3>
              <p className="text-gray-600">
                Carga una foto personal y aplica filtros IA para crear un NFT único
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold text-xl">2</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Deposita Cripto</h3>
              <p className="text-gray-600">
                Añade USDC que se guardará automáticamente en la wallet del NFT
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold text-xl">3</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Comparte el Regalo</h3>
              <p className="text-gray-600">
                Envía el link o QR a tu amigo para que reclame su NFT-wallet
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Regala el futuro hoy
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Cada regalo es una invitación al ecosistema cripto. Empieza ahora y gana comisiones por cada amigo que invites.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={handleCreateGift}
              className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
            >
              Crear mi Primer Regalo
            </button>
            {mounted && (
              <ConnectButton
                client={client}
                appMetadata={{
                  name: "CryptoGift Wallets",
                  url: "https://cryptogift-wallets.vercel.app",
                }}
              />
            )}
          </div>
        </div>
      </section>

      {/* Gift Wizard Modal */}
      {showWizard && (
        <GiftWizard
          isOpen={showWizard}
          onClose={() => setShowWizard(false)}
          referrer={referrer}
        />
      )}

      {/* Referral Welcome Banner */}
      {showWelcomeBanner && referrer && (
        <ReferralWelcomeBanner
          referrerAddress={referrer}
          onClose={handleCloseBanner}
        />
      )}
    </main>
  );
}
