'use client';

import React from "react"
import Button from "@/app/components/ui/Button"
import { Input } from "@/app/components/ui/Input"
import Image from "next/image"
import { useBranding } from "@/lib/hooks/useBranding"

// Social media icon components
const SocialIcon = ({ platform }: { platform: string }) => {
  const icons: Record<string, React.JSX.Element> = {
    twitter: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/>
      </svg>
    ),
    facebook: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    ),
    linkedin: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
      </svg>
    ),
    pinterest: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.174-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.402.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.357-.629-2.746-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24.009 12.017 24c6.624 0 11.99-5.367 11.99-11.988C24.007 5.367 18.641.001 12.017.001z"/>
      </svg>
    ),
  };
  return icons[platform.toLowerCase()] || null;
};

export function Footer() {
  const {
    footerBrandTitle,
    footerBrandSubtitle,
    footerBrandDescription,
    footerCopyright,
    footerNewsletterTitle,
    footerNewsletterDescription,
    footerNewsletterButtonText,
    footerMemberStatesTitle,
    footerMemberStatesSubtitle,
    footerSocialLinks,
    footerPlatforms,
    footerResources,
    footerBottomLinks,
    footerMemberStates,
    footerBrandEnabled,
    footerPlatformsEnabled,
    footerResourcesEnabled,
    footerNewsletterEnabled,
    footerMemberStatesEnabled,
    logoUrl,
    logoSize,
    siteShortName,
  } = useBranding();

  // Fallback to defaults if arrays are empty
  const defaultMemberStates = [
    "Antigua and Barbuda",
    "Dominica",
    "Grenada",
    "Montserrat",
    "Saint Kitts and Nevis",
    "Saint Lucia",
    "Saint Vincent and the Grenadines",
    "Anguilla",
    "British Virgin Islands",
    "Martinique",
    "Guadeloupe",
    "St. Maarten",
  ];
  
  const memberStates = footerMemberStates.length > 0 ? footerMemberStates : defaultMemberStates;
  return (
    <footer className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-indigo-600/10"></div>
        <div className="absolute top-0 left-0 w-full h-full" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}></div>
      </div>
      
      <div className="relative mx-auto max-w-8xl px-4 py-16 lg:py-20">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12 mb-16">
          {/* Brand Section */}
          {footerBrandEnabled && (
          <div className="lg:col-span-1">
            <div className="flex items-center gap-4 mb-6">
              <div className="relative flex h-14 w-14 items-center justify-center rounded-lg shadow-lg overflow-hidden border border-white/10">
                {/* Textured background */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-indigo-600"></div>
                <div 
                  className="absolute inset-0 opacity-20"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M20 20.5V18H0v-2h20v-2H0v-2h20v-2H0V8h20V6H0V4h20V2H0V0h22v20h2V0h2v20h2V0h2v20h2V0h2v20h2V0h2v22H20v-1.5zM0 20h2v20H0V20zm4 0h2v20H4V20zm4 0h2v20H8V20zm4 0h2v20h-2V20zm4 0h2v20h-2V20zm4 4h20v2H20v-2zm0 4h20v2H20v-2zm0 4h20v2H20v-2zm0 4h20v2H20v-2z'/%3E%3C/g%3E%3C/svg%3E")`,
                    backgroundSize: '20px 20px'
                  }}
                ></div>
                {/* Subtle noise texture */}
                <div 
                  className="absolute inset-0 opacity-10"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
                  }}
                ></div>
                {/* Logo */}
                <Image
                  src={logoUrl}
                  alt={`${siteShortName} Logo`}
                  width={parseInt(logoSize) || 32}
                  height={parseInt(logoSize) || 32}
                  className="relative z-10 h-8 w-8 object-contain"
                  style={{ width: `${parseInt(logoSize) || 32}px`, height: `${parseInt(logoSize) || 32}px` }}
                />
              </div>
              <div>
                <h3 className="text-xl font-bold leading-tight">
                  {footerBrandTitle}
                  <br />
                  <span className="text-blue-400">{footerBrandSubtitle}</span>
                </h3>
              </div>
            </div>
            <p className="text-gray-300 leading-relaxed mb-6 text-base">
              {footerBrandDescription}
            </p>
            
            {/* Social Links */}
            <div className="flex gap-4">
              {(footerSocialLinks.length > 0 ? footerSocialLinks : [
                { platform: 'twitter', url: '#', enabled: true },
                { platform: 'facebook', url: '#', enabled: true },
                { platform: 'linkedin', url: '#', enabled: true },
                { platform: 'pinterest', url: '#', enabled: true },
              ]).filter(link => link.enabled).map((link, index) => (
                <a
                  key={index}
                  href={link.url}
                  className="w-10 h-10 bg-gray-700 hover:bg-blue-600 rounded-lg flex items-center justify-center transition-all duration-200 hover:scale-110"
                >
                  <SocialIcon platform={link.platform} />
                </a>
              ))}
            </div>
          </div>
          )}

          {/* Platforms Section */}
          {footerPlatformsEnabled && (
          <div>
            <h4 className="text-lg font-bold mb-6 text-white flex items-center">
              <svg className="w-5 h-5 mr-2 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              Platforms
            </h4>
            <ul className="space-y-3">
              {(footerPlatforms.length > 0 ? footerPlatforms : [
                { label: 'Learning Hub', url: '#', enabled: true },
                { label: 'MyPD', url: '#', enabled: true },
                { label: 'Pearl AI', url: '#', enabled: true },
                { label: 'Knowledge Gateway', url: '#', enabled: true },
              ]).filter(link => link.enabled).map((link, index) => (
                <li key={index}>
                  <a href={link.url} className="text-gray-300 hover:text-blue-400 transition-colors duration-200 flex items-center group">
                    <svg className="w-4 h-4 mr-2 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          )}

          {/* Resources Section */}
          {footerResourcesEnabled && (
          <div>
            <h4 className="text-lg font-bold mb-6 text-white flex items-center">
              <svg className="w-5 h-5 mr-2 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              Resources
            </h4>
            <ul className="space-y-3">
              {(footerResources.length > 0 ? footerResources : [
                { label: 'Documentation', url: '#', enabled: true },
                { label: 'Training', url: '#', enabled: true },
                { label: 'Research', url: '#', enabled: true },
                { label: 'Support', url: '#', enabled: true },
              ]).filter(link => link.enabled).map((link, index) => (
                <li key={index}>
                  <a href={link.url} className="text-gray-300 hover:text-purple-400 transition-colors duration-200 flex items-center group">
                    <svg className="w-4 h-4 mr-2 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          )}

          {/* Newsletter Section */}
          {footerNewsletterEnabled && (
          <div>
            <h4 className="text-lg font-bold mb-6 text-white flex items-center">
              <svg className="w-5 h-5 mr-2 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              {footerNewsletterTitle}
            </h4>
            <p className="text-gray-300 mb-6 leading-relaxed">
              {footerNewsletterDescription}
            </p>
            <div className="space-y-4">
              <div suppressHydrationWarning={true}>
                <Input 
                  type="email" 
                  placeholder="Enter your email address" 
                  className="w-full px-4 py-3 bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent rounded-lg"
                />
              </div>
              <div suppressHydrationWarning={true}>
                <button className="w-full bg-slate-800 hover:bg-slate-700 text-white font-medium py-2 px-4 rounded-md transition-all duration-200 shadow-sm hover:shadow flex items-center justify-center group">
                  <svg className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  {footerNewsletterButtonText}
                </button>
              </div>
            </div>
          </div>
          )}
        </div>

        {/* Member States Section */}
        {footerMemberStatesEnabled && (
        <div className="border-t border-gray-700 pt-12 mb-8">
          <div className="text-center mb-8">
            <h4 className="text-xl font-bold mb-4 text-white flex items-center justify-center">
              <Image
                src="/oecs-logo.png"
                alt="OECS Logo"
                width={24}
                height={24}
                className="w-6 h-6 mr-3 object-contain"
              />
              {footerMemberStatesTitle}
            </h4>
            <p className="text-gray-400 text-sm">{footerMemberStatesSubtitle}</p>
          </div>
          <div className="flex flex-wrap gap-3 justify-center">
            {memberStates.map((state, index) => (
              <span key={index} className="px-4 py-2 bg-gradient-to-r from-blue-500/20 to-indigo-500/20 text-blue-300 border border-blue-400/30 rounded-full text-sm font-medium hover:from-blue-500/30 hover:to-indigo-500/30 hover:border-blue-400/50 transition-all duration-200">
                {state}
              </span>
            ))}
          </div>
        </div>
        )}

        {/* Bottom Section */}
        <div className="border-t border-gray-700 pt-8">
          <div className="flex flex-col lg:flex-row justify-between items-center gap-6">
            <div className="text-gray-400 text-sm">
              {footerCopyright}
            </div>
            <div className="flex flex-wrap gap-8 text-sm">
              {(footerBottomLinks.length > 0 ? footerBottomLinks : [
                { label: 'Privacy Policy', url: '/privacy', enabled: true },
                { label: 'Terms of Use', url: '/terms', enabled: true },
                { label: 'Help Center', url: '/help', enabled: true },
                { label: 'Accessibility', url: '/accessibility', enabled: true },
              ]).filter(link => link.enabled).map((link, index) => {
                // Ensure legal pages always link to the correct URLs
                let url = link.url;
                if (link.label.toLowerCase().includes('privacy')) url = '/privacy';
                else if (link.label.toLowerCase().includes('terms')) url = '/terms';
                else if (link.label.toLowerCase().includes('help') && !link.label.toLowerCase().includes('accessibility')) url = '/help';
                else if (link.label.toLowerCase().includes('accessibility')) url = '/accessibility';

                return (
                  <a
                    key={index}
                    href={url}
                    className="text-gray-400 hover:text-white transition-colors duration-200 font-medium"
                  >
                    {link.label}
                  </a>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
