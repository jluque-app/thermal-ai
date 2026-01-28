
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { getUserIdentity } from "@/components/userIdentity";
import { Button } from "@/components/ui/button";
import { LogOut, User, Menu, X, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/toaster";
import ScrollToTop from "@/components/ScrollToTop";
import { LoginDialog } from "@/components/LoginDialog";



export default function Layout({ children, currentPageName }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, isLoadingAuth } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);

  useEffect(() => {
    if (user) {
      refreshEntitlements(user, true);
    }
  }, [user]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  async function refreshEntitlements(userObj, silent = false) {
    if (!silent) setRefreshing(true);
    try {
      const { userId, userEmail } = getUserIdentity(userObj);
      // Using relative path so Vercel rewrites it to the Render Backend
      const response = await fetch(`/v1/billing/me?user_id=${encodeURIComponent(userId)}&user_email=${encodeURIComponent(userEmail)}`);

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('thermalai_entitlements', JSON.stringify(data));
        localStorage.setItem('thermalai_entitlements_timestamp', Date.now().toString());
        if (!silent) alert('Access refreshed successfully!');
      }
    } catch (error) {
      console.error('Failed to refresh entitlements:', error);
    } finally {
      if (!silent) setRefreshing(false);
    }
  }

  function handleLogin() {
    setLoginOpen(true);
  }

  async function handleLogout() {
    try {
      localStorage.removeItem('thermalai_entitlements');
      localStorage.removeItem('thermalai_entitlements_timestamp');
      localStorage.removeItem('thermalai_selected_plan');
      logout(); // Use context logout
      navigate('/Home');
    } catch (error) {
      navigate('/Home');
    }
  }

  const navLinks = [
    { name: "ThermalAI app", path: "/AppHome" },
    { name: "Chat ThermalAI", path: "/ExpertPreview" },
    { name: "Pricing", path: "/PlanSelection" },
  ];

  return (
    <div className="min-h-screen flex flex-col font-sans selection:bg-brand-teal-500/30">
      <ScrollToTop />
      <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} />
      {/* Navigation */}
      <nav
        className={cn(
          "fixed top-0 w-full z-50 transition-all duration-300 border-b border-transparent",
          scrolled || mobileMenuOpen ? "bg-white/90 backdrop-blur-md border-slate-200 py-4 shadow-sm" : "bg-transparent py-6"
        )}
      >
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <div
            className="flex items-center gap-2 cursor-pointer group"
            onClick={() => navigate('/Home')}
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:shadow-emerald-500/40 transition-all">
              <span className="text-white font-bold text-lg">T</span>
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900 transition-colors">
              Thermal<span className="text-emerald-600">AI</span>
            </span>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <button
                key={link.name}
                onClick={() => navigate(link.path)}
                className="text-sm font-medium text-slate-600 hover:text-emerald-600 transition-colors bg-transparent border-none p-0"
              >
                {link.name}
              </button>
            ))}
          </div>

          {/* Auth Buttons */}
          <div className="hidden md:flex items-center gap-4">
            {isLoadingAuth ? (
              <div className="h-9 w-24 bg-slate-100 animate-pulse rounded-full"></div>
            ) : user ? (
              <div className="flex items-center gap-4">
                <span className="text-sm text-slate-600 truncate max-w-[150px]">{user.email}</span>
                <Button
                  variant="ghost"
                  onClick={handleLogout}
                  className="text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
                <Button
                  onClick={() => navigate('/AppHome')}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-full px-6"
                >
                  Dashboard
                </Button>
              </div>
            ) : (
              <>
                <button
                  onClick={handleLogin}
                  className="text-sm font-medium text-slate-500 hover:text-emerald-600 transition-colors bg-transparent border-none mr-2"
                >
                  Log in / Sign up
                </button>
                <Button
                  onClick={() => navigate('/PlanSelection')}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-full px-6 transition-all shadow-md hover:shadow-lg"
                >
                  Get Started <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </>
            )}
          </div>

          {/* Mobile Toggle */}
          <button
            className="md:hidden text-white"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden absolute top-full left-0 w-full glass border-t border-white/10 p-6 flex flex-col gap-4 animate-in slide-in-from-top-4">
            {navLinks.map((link) => (
              <button
                key={link.name}
                onClick={() => { navigate(link.path); setMobileMenuOpen(false); }}
                className="text-left text-base font-medium text-slate-300 hover:text-brand-teal-500 py-2 border-b border-white/5 bg-transparent"
              >
                {link.name}
              </button>
            ))}

            {user ? (
              <div className="flex flex-col gap-3 mt-4">
                <div className="text-sm text-slate-400">{user.email}</div>
                <Button onClick={() => navigate('/NewAnalysis')} className="w-full bg-brand-teal-500 text-brand-navy-900">Dashboard</Button>
                <Button variant="outline" onClick={handleLogout} className="w-full border-white/10 text-slate-300">Log out</Button>
              </div>
            ) : (
              <div className="flex flex-col gap-3 mt-4">
                <Button variant="ghost" onClick={handleLogin} className="w-full text-white hover:bg-white/5">Log in</Button>
                <Button onClick={handleLogin} className="w-full bg-white text-brand-navy-900">Get Started</Button>
              </div>
            )}
          </div>
        )}
      </nav>

      {/* Main Content */}
      <main className="flex-grow pt-20">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-brand-navy-900 border-t border-white/5 py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <div className="col-span-1 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 rounded bg-brand-teal-500 flex items-center justify-center">
                  <span className="text-brand-navy-900 font-bold text-xs">T</span>
                </div>
                <span className="text-lg font-bold text-white">ThermalAI</span>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed">
                AI-powered building physics expertise for real estate professionals.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href="#" className="hover:text-brand-teal-500">Expert AI</a></li>
                <li><a href="#" className="hover:text-brand-teal-500">Analysis App</a></li>
                <li><a href="#" className="hover:text-brand-teal-500">Reporting</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href="#" className="hover:text-brand-teal-500">About</a></li>
                <li><a href="#" className="hover:text-brand-teal-500">Contact</a></li>
                <li><a href="#" className="hover:text-brand-teal-500">Privacy Policy</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Contact</h4>
              <p className="text-sm text-slate-400">info@allretech.org</p>
            </div>
          </div>
          <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-500">
            <p>© 2026 ThermalAI. All rights reserved.</p>
            <div className="flex gap-4">
              <a href="#" className="hover:text-slate-300">Terms</a>
              <a href="#" className="hover:text-slate-300">Privacy</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}