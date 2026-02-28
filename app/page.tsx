'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Icon } from '@iconify/react';
import { useBranding } from '@/lib/hooks/useBranding';
import { useSupabase } from '@/lib/supabase-provider';
import { useEffect, useState } from 'react';
import { stripHtml } from '@/lib/utils';

interface FeaturedCourse {
  id: string;
  title: string;
  description: string | null;
  thumbnail: string | null;
  grade_level: string | null;
  subject_area: string | null;
  difficulty: string;
  student_count: number;
  duration: string;
  rating: number;
}

export default function Home() {
  const router = useRouter();
  const { user } = useSupabase();

  // Redirect logged-in users to dashboard
  useEffect(() => {
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]);

  const {
    homepageHeaderBackground,
    homepageHeroTitle,
    homepageHeroSubtitle,
    homepageHeroDescription,
    homepageHeroCtaPrimaryText,
    homepageHeroCtaSecondaryText,
    homepageHeroStatStudents,
    homepageHeroStatEducators,
    homepageHeroStatCountries,
    homepageFeaturesBadge,
    homepageFeaturesTitle,
    homepageFeaturesTitleHighlight,
    homepageFeaturesDescription,
    homepageFeatures,
    homepageCoursesBadge,
    homepageCoursesTitle,
    homepageCoursesTitleHighlight,
    homepageCoursesDescription,
    homepageCoursesCtaText,
    homepageTestimonialsBadge,
    homepageTestimonialsTitle,
    homepageTestimonialsTitleHighlight,
    homepageTestimonialsDescription,
    homepageTestimonials,
    homepageCtaTitle,
    homepageCtaTitleHighlight,
    homepageCtaDescription,
    homepageCtaPrimaryText,
    homepageCtaSecondaryText,
    homepageHeroEnabled,
    homepageFeaturesEnabled,
    homepageCoursesEnabled,
    homepageTestimonialsEnabled,
    homepageCtaEnabled
  } = useBranding();
  const [featuredCourses, setFeaturedCourses] = useState<FeaturedCourse[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState<FeaturedCourse | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch featured courses
  useEffect(() => {
    const fetchFeaturedCourses = async () => {
      try {
        const res = await fetch('/api/courses/featured?limit=6');
        const data = await res.json();
        if (data.success && data.courses) {
          setFeaturedCourses(data.courses);
        }
      } catch (error) {
        console.error('Error fetching featured courses:', error);
      } finally {
        setLoadingCourses(false);
      }
    };

    fetchFeaturedCourses();
  }, []);

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isModalOpen) {
        setIsModalOpen(false);
      }
    };

    if (isModalOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isModalOpen]);

  // Helper function to convert hex to rgba
  const hexToRgba = (hex: string, alpha: number = 1) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return `rgba(0, 0, 0, ${alpha})`;
    const r = parseInt(result[1], 16);
    const g = parseInt(result[2], 16);
    const b = parseInt(result[3], 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  // Helper function to get theme color as rgba
  const getThemeColorRgba = (colorVar: string, alpha: number = 1) => {
    if (typeof window === 'undefined') return `rgba(59, 130, 246, ${alpha})`; // fallback
    const hex = getComputedStyle(document.documentElement).getPropertyValue(colorVar).trim();
    return hexToRgba(hex, alpha);
  };

  // Helper function to get gradient color based on index using theme colors
  const getGradientColor = (index: number) => {
    // Use theme colors with variations based on index
    const variations = [
      { from: 'var(--theme-primary)', to: 'var(--theme-secondary)' },
      { from: 'var(--theme-secondary)', to: 'var(--theme-accent)' },
      { from: 'var(--theme-primary)', to: 'var(--theme-accent)' },
      { from: 'var(--theme-secondary)', to: 'var(--theme-primary)' },
      { from: 'var(--theme-accent)', to: 'var(--theme-primary)' },
      { from: 'var(--theme-primary)', to: 'var(--theme-secondary)' }
    ];
    const variation = variations[index % variations.length];
    return `linear-gradient(to bottom right, ${variation.from}, ${variation.to})`;
  };

  // Get overlay gradient with opacity
  const [overlayGradient, setOverlayGradient] = useState('linear-gradient(to bottom right, rgba(59, 130, 246, 0.8), rgba(99, 102, 241, 0.8), rgba(96, 165, 250, 0.8))');

  useEffect(() => {
    // Update overlay gradient when theme changes
    const updateOverlay = () => {
      const primary = getComputedStyle(document.documentElement).getPropertyValue('--theme-primary').trim();
      const secondary = getComputedStyle(document.documentElement).getPropertyValue('--theme-secondary').trim();
      const accent = getComputedStyle(document.documentElement).getPropertyValue('--theme-accent').trim();
      
      const gradient = `linear-gradient(to bottom right, ${hexToRgba(primary, 0.8)}, ${hexToRgba(secondary, 0.8)}, ${hexToRgba(accent, 0.8)})`;
      setOverlayGradient(gradient);
    };

    updateOverlay();
    
    // Listen for theme changes
    if (typeof window !== 'undefined') {
      window.addEventListener('branding-settings-updated', updateOverlay);
      // Also check periodically in case CSS variables update
      const interval = setInterval(updateOverlay, 500);
      return () => {
        window.removeEventListener('branding-settings-updated', updateOverlay);
        clearInterval(interval);
      };
    }
  }, []);

  // Helper function to get icon based on subject
  const getCourseIcon = (subject?: string | null) => {
    if (!subject) return "material-symbols:school";
    const subjectLower = subject.toLowerCase();
    if (subjectLower.includes('math')) return "material-symbols:calculate";
    if (subjectLower.includes('history')) return "material-symbols:history-edu";
    if (subjectLower.includes('science') || subjectLower.includes('environment')) return "material-symbols:eco";
    if (subjectLower.includes('marketing')) return "material-symbols:trending-up";
    if (subjectLower.includes('finance') || subjectLower.includes('financial')) return "material-symbols:account-balance";
    if (subjectLower.includes('analytics') || subjectLower.includes('merl')) return "material-symbols:analytics";
    return "material-symbols:school";
  };

  return (
    <div 
      className="min-h-screen"
      style={{
        background: `linear-gradient(to bottom right, #f9fafb, #ffffff, var(--theme-primary)08)`
      }}
    >
      {/* Hero Section */}
      {homepageHeroEnabled && (
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Background Image */}
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: `url('${homepageHeaderBackground}')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }}
        ></div>
        
        {/* Overlay for better text readability */}
        <div 
          className="absolute inset-0"
          style={{
            background: overlayGradient
          }}
        ></div>
        
        {/* Pattern Overlay */}
        <div 
          className="absolute inset-0" 
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }}
        ></div>
        
        {/* Floating Elements - hidden on mobile to prevent overflow */}
        <div className="hidden sm:block absolute top-20 left-10 w-20 h-20 bg-white/10 rounded-full blur-xl animate-pulse"></div>
        <div
          className="hidden sm:block absolute top-40 right-20 w-32 h-32 rounded-full blur-2xl animate-pulse delay-1000"
          style={{ backgroundColor: `var(--theme-primary)33` }}
        ></div>
        <div
          className="hidden sm:block absolute bottom-20 left-1/4 w-24 h-24 rounded-full blur-xl animate-pulse delay-2000"
          style={{ backgroundColor: `var(--theme-accent)33` }}
        ></div>
        
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mb-8"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-white/90 text-sm font-medium mb-6">
              <Icon icon="material-symbols:school" className="w-4 h-4" />
              <span>{homepageHeroSubtitle}</span>
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-bold text-white mb-6 leading-tight"
          >
            {homepageHeroTitle.includes('OECS Professional') ? (
              <>
                The OECS Professional
                <span className="block bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
                  Development Platform
                </span>
              </>
            ) : (
              homepageHeroTitle
            )}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-xl md:text-2xl text-white/90 mb-12 max-w-4xl mx-auto leading-relaxed"
          >
            {homepageHeroDescription}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
          >
            <Link 
              href="/auth/signup" 
              className="group relative px-6 sm:px-8 py-3 sm:py-4 min-h-[44px] bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-bold text-base sm:text-lg rounded-2xl shadow-2xl hover:shadow-yellow-500/25 transition-all duration-300 hover:scale-105 flex items-center justify-center w-full sm:w-auto"
            >
              <span className="relative z-10">{homepageHeroCtaPrimaryText}</span>
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-300 to-orange-400 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </Link>
            
            <Link 
              href="/courses" 
              className="group px-6 sm:px-8 py-3 sm:py-4 min-h-[44px] bg-white/10 backdrop-blur-sm text-white font-semibold text-base sm:text-lg rounded-2xl border border-white/20 hover:bg-white/20 transition-all duration-300 hover:scale-105 flex items-center justify-center w-full sm:w-auto"
            >
              <span className="flex items-center gap-2">
                <Icon icon="material-symbols:play-arrow" className="w-5 h-5" />
                {homepageHeroCtaSecondaryText}
              </span>
            </Link>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="grid grid-cols-2 md:grid-cols-3 gap-8 max-w-4xl mx-auto"
          >
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-white mb-2">{homepageHeroStatStudents}</div>
              <div className="text-white/70 text-sm">Students</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-white mb-2">{homepageHeroStatEducators}</div>
              <div className="text-white/70 text-sm">Educators</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-white mb-2">{homepageHeroStatCountries}</div>
              <div className="text-white/70 text-sm">Countries</div>
            </div>
          </motion.div>
        </div>

        {/* Scroll Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1 }}
          className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
        >
          <div className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center">
            <motion.div
              animate={{ y: [0, 12, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-1 h-3 bg-white/60 rounded-full mt-2"
            ></motion.div>
          </div>
        </motion.div>
      </section>
      )}

      {/* Features Section */}
      {homepageFeaturesEnabled && (
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-600 rounded-full text-sm font-semibold mb-6">
              <Icon icon="material-symbols:star" className="w-4 h-4" />
              <span>{homepageFeaturesBadge}</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              {homepageFeaturesTitle}
              <span className="block bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                {homepageFeaturesTitleHighlight}
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              {homepageFeaturesDescription}
            </p>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {(homepageFeatures.length > 0 ? homepageFeatures : [
              {
                icon: "material-symbols:security",
                title: "Enterprise Security",
                description: "Bank-level security with role-based access control, data encryption, and compliance with international standards.",
                color: "from-green-500 to-emerald-600"
              },
              {
                icon: "material-symbols:groups",
                title: "Collaborative Learning",
                description: "Connect with students and instructors across 15 Caribbean countries in real-time discussions and group projects.",
                color: "from-blue-500 to-cyan-600"
              },
              {
                icon: "material-symbols:analytics",
                title: "Advanced Analytics",
                description: "Comprehensive progress tracking, performance analytics, and personalized learning recommendations.",
                color: "from-purple-500 to-violet-600"
              },
              {
                icon: "material-symbols:smart-toy",
                title: "AI-Powered Learning",
                description: "Intelligent tutoring system with adaptive learning paths and automated assessment capabilities.",
                color: "from-orange-500 to-red-500"
              },
              {
                icon: "material-symbols:mobile-friendly",
                title: "Mobile First Design",
                description: "Seamless learning experience across all devices with offline capabilities and sync functionality.",
                color: "from-indigo-500 to-blue-600"
              },
              {
                icon: "material-symbols:support-agent",
                title: "24/7 Support",
                description: "Round-the-clock technical support and academic assistance from our dedicated Caribbean team.",
                color: "from-teal-500 to-green-600"
              }
            ]).map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="group relative bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-gray-100"
              >
                <div 
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300"
                  style={{
                    background: `linear-gradient(to bottom right, var(--theme-primary), var(--theme-secondary))`
                  }}
                >
                  <Icon icon={feature.icon} className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.description}</p>
                <div 
                  className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10"
                  style={{
                    background: `linear-gradient(to bottom right, var(--theme-primary)15, var(--theme-accent)15)`
                  }}
                ></div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      )}

      {/* Courses Section */}
      {homepageCoursesEnabled && (
      <section 
        className="py-20"
        style={{
          background: `linear-gradient(to bottom right, #f9fafb, #ffffff)`
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <div 
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold mb-6"
              style={{
                backgroundColor: `var(--theme-primary)20`,
                color: `var(--theme-primary)`
              }}
            >
              <Icon icon="material-symbols:school" className="w-4 h-4" />
              <span>{homepageCoursesBadge}</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              {homepageCoursesTitle}{' '}
              <span 
                className="inline-block bg-clip-text text-transparent bg-gradient-to-r"
                style={{
                  backgroundImage: `linear-gradient(to right, var(--theme-primary), var(--theme-secondary))`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}
              >
                {homepageCoursesTitleHighlight}
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
              {homepageCoursesDescription}
            </p>
            <Link 
              href="/courses" 
              className="inline-flex items-center gap-2 px-6 py-3 text-white font-semibold rounded-xl transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl"
              style={{
                background: `linear-gradient(to right, var(--theme-primary), var(--theme-secondary))`
              }}
              onMouseEnter={(e) => {
                const primary = getComputedStyle(document.documentElement).getPropertyValue('--theme-primary');
                const secondary = getComputedStyle(document.documentElement).getPropertyValue('--theme-secondary');
                e.currentTarget.style.background = `linear-gradient(to right, ${primary}DD, ${secondary}DD)`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = `linear-gradient(to right, var(--theme-primary), var(--theme-secondary))`;
              }}
            >
              <span>{homepageCoursesCtaText}</span>
              <Icon icon="material-symbols:arrow-forward" className="w-5 h-5" />
            </Link>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {loadingCourses ? (
              // Loading skeleton
              [...Array(6)].map((_, index) => (
                <div key={index} className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100 animate-pulse">
                  <div className="h-48 bg-gray-200"></div>
                  <div className="p-6">
                    <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
                    <div className="h-6 bg-gray-200 rounded w-2/3 mb-3"></div>
                    <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                    <div className="h-10 bg-gray-200 rounded"></div>
                  </div>
                </div>
              ))
            ) : featuredCourses.length > 0 ? (
              // Featured courses from database
              featuredCourses.map((course, index) => (
                <motion.div
                  key={course.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 overflow-hidden border border-gray-100"
                >
                  <div 
                    className="h-48 relative overflow-hidden"
                    style={{
                      background: getGradientColor(index)
                    }}
                  >
                    {course.thumbnail ? (
                      <img 
                        src={course.thumbnail} 
                        alt={course.title}
                        className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    ) : (
                      <div 
                        className="h-full w-full opacity-90"
                        style={{
                          background: getGradientColor(index)
                        }}
                      ></div>
                    )}
                    <div 
                      className="absolute inset-0"
                      style={{
                        background: `linear-gradient(to bottom, transparent, var(--theme-primary)40)`
                      }}
                    ></div>
                    <div className="absolute top-4 right-4">
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                        Free
                      </span>
                    </div>
                    <div className="absolute bottom-4 left-4">
                      <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                        <Icon icon={getCourseIcon(course.subject_area)} className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-6">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide capitalize">
                        {course.difficulty || 'Beginner'}
                      </span>
                      <span className="text-gray-300">•</span>
                      <span className="text-xs text-gray-500">{course.duration}</span>
                    </div>
                    
                    <h3 
                      className="text-xl font-bold text-gray-900 mb-3 group-hover:transition-colors line-clamp-2"
                      style={{
                        '--hover-color': 'var(--theme-primary)'
                      } as React.CSSProperties & { '--hover-color': string }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = 'var(--theme-primary)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = '';
                      }}
                    >
                      {course.title}
                    </h3>
                    
                    <p className="text-gray-600 mb-4 leading-relaxed line-clamp-3">
                      {stripHtml(course.description || '') || 'Explore this comprehensive course designed for Caribbean learners.'}
                    </p>
                    
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-1">
                        <Icon icon="material-symbols:star" className="w-4 h-4 text-yellow-400" />
                        <span className="text-sm font-semibold text-gray-900">{course.rating.toFixed(1)}</span>
                        <span className="text-sm text-gray-500">
                          ({course.student_count > 0 ? `${course.student_count.toLocaleString()}+` : '0'} students)
                        </span>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => {
                        setSelectedCourse(course);
                        setIsModalOpen(true);
                      }}
                      className="w-full text-white font-semibold py-3 px-4 rounded-xl transition-all duration-300 text-center block group-hover:shadow-lg"
                      style={{
                        background: `linear-gradient(to right, var(--theme-primary), var(--theme-secondary))`
                      }}
                      onMouseEnter={(e) => {
                        const primary = getComputedStyle(document.documentElement).getPropertyValue('--theme-primary');
                        const secondary = getComputedStyle(document.documentElement).getPropertyValue('--theme-secondary');
                        e.currentTarget.style.background = `linear-gradient(to right, ${primary}DD, ${secondary}DD)`;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = `linear-gradient(to right, var(--theme-primary), var(--theme-secondary))`;
                      }}
                    >
                      Enroll Now
                    </button>
                  </div>
                </motion.div>
              ))
            ) : (
              // Fallback: Show message if no featured courses
              <div className="col-span-full text-center py-12">
                <Icon icon="material-symbols:school" className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 text-lg">No featured courses available yet.</p>
                <p className="text-gray-500 text-sm mt-2">Check back soon for new courses!</p>
              </div>
            )}
          </div>
        </div>
      </section>
      )}

      {/* Testimonials Section */}
      {homepageTestimonialsEnabled && (
      <section 
        className="py-20 relative overflow-hidden bg-white"
      >
        {/* Background Pattern */}
        <div 
          className="absolute inset-0" 
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Ccircle cx='30' cy='30' r='1.5'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }}
        ></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <div 
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold mb-6 border"
              style={{
                backgroundColor: `var(--theme-primary)20`,
                color: `var(--theme-primary)`,
                borderColor: `var(--theme-primary)30`
              }}
            >
              <Icon icon="material-symbols:format-quote" className="w-4 h-4" />
              <span>{homepageTestimonialsBadge}</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              <span className="text-gray-900">{homepageTestimonialsTitle}</span>
              {' '}
              <span 
                className="inline-block bg-clip-text text-transparent bg-gradient-to-r"
                style={{
                  backgroundImage: `linear-gradient(to right, #FBBF24, #F59E0B)`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}
              >
                {homepageTestimonialsTitleHighlight}
              </span>
            </h2>
            <p className="text-xl text-gray-800 max-w-3xl mx-auto">
              {homepageTestimonialsDescription}
            </p>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {(homepageTestimonials.length > 0 ? homepageTestimonials : [
              {
                quote: "LearnBoard has completely transformed how I teach mathematics. The interactive tools and real-time collaboration features have made my students more engaged than ever before.",
                author: "Mathematics Instructor",
                role: "Instructor",
                location: "Antigua and Barbuda",
                avatar: "MI",
                rating: 5
              },
              {
                quote: "As a working professional, I needed flexible learning options. LearnBoard's mobile-first design and offline capabilities allow me to study anywhere, anytime.",
                author: "Business Student",
                role: "Student",
                location: "St. Lucia",
                avatar: "BS",
                rating: 5
              },
              {
                quote: "The administrative dashboard is incredibly powerful. Managing multiple classes, tracking student progress, and generating reports has never been easier.",
                author: "Education Director",
                role: "Administrator",
                location: "Dominica",
                avatar: "ED",
                rating: 5
              },
              {
                quote: "The AI-powered learning recommendations have helped me identify my weak areas and focus on improving them. It's like having a personal tutor!",
                author: "Computer Science Student",
                role: "Student",
                location: "Grenada",
                avatar: "CS",
                rating: 5
              },
              {
                quote: "The platform's security and reliability give me confidence that our students' data is safe. The 24/7 support team is also incredibly responsive.",
                author: "IT Administrator",
                role: "Administrator",
                location: "Barbados",
                avatar: "IT",
                rating: 5
              },
              {
                quote: "LearnBoard has made it possible for our small island to offer world-class education. The collaborative features connect our students with peers across the region.",
                author: "School Principal",
                role: "Administrator",
                location: "St. Vincent",
                avatar: "SP",
                rating: 5
              }
            ]).map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-gray-100"
              >
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Icon key={i} icon="material-symbols:star" className="w-4 h-4 text-yellow-400" />
                  ))}
                </div>
                
                <blockquote className="text-lg text-gray-800 mb-6 leading-relaxed">
                  "{testimonial.quote}"
                </blockquote>
                
                <div className="flex items-center gap-4">
                  <div 
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm"
                    style={{
                      background: `linear-gradient(to bottom right, var(--theme-primary), var(--theme-secondary))`
                    }}
                  >
                    {testimonial.avatar}
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">{testimonial.author}</h4>
                    <p className="text-sm text-gray-600">{testimonial.role}</p>
                    <p className="text-xs text-gray-500">{testimonial.location}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      )}

      {/* Call to Action Section */}
      {homepageCtaEnabled && (
      <section 
        className="py-20 relative overflow-hidden"
        style={{
          background: `linear-gradient(to right, var(--theme-primary), var(--theme-secondary), var(--theme-accent))`
        }}
      >
        <div 
          className="absolute inset-0" 
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }}
        ></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-6xl font-bold text-white mb-6">
              {homepageCtaTitle}
              <span className="block bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
                {homepageCtaTitleHighlight}
              </span>
            </h2>
            
            <p className="text-xl text-white/90 mb-12 max-w-3xl mx-auto">
              {homepageCtaDescription}
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <Link 
                href="/auth/signup" 
                className="group relative px-8 py-4 bg-white font-bold text-lg rounded-2xl shadow-2xl hover:shadow-white/25 transition-all duration-300 hover:scale-105"
                style={{
                  color: 'var(--theme-primary)'
                }}
              >
                <span className="relative z-10 flex items-center gap-2">
                  <Icon icon="material-symbols:rocket-launch" className="w-5 h-5" />
                  {homepageCtaPrimaryText}
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </Link>
              
              <Link 
                href="/courses" 
                className="group px-8 py-4 bg-white/10 backdrop-blur-sm text-white font-semibold text-lg rounded-2xl border border-white/20 hover:bg-white/20 transition-all duration-300 hover:scale-105"
              >
                <span className="flex items-center gap-2">
                  <Icon icon="material-symbols:explore" className="w-5 h-5" />
                  {homepageCtaSecondaryText}
                </span>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
      )}

      {/* Course Enrollment Modal */}
      {isModalOpen && selectedCourse && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setIsModalOpen(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h2 className="text-2xl font-bold text-gray-900">{selectedCourse.title}</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label="Close modal"
              >
                <Icon icon="material-symbols:close" className="w-6 h-6 text-gray-500" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="px-6 py-6">
              {/* Course Info */}
              <div className="flex items-center gap-3 mb-4 text-sm text-gray-600">
                <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 font-semibold capitalize">
                  {selectedCourse.difficulty || 'Beginner'}
                </span>
                <span className="text-gray-300">•</span>
                <span>{selectedCourse.duration}</span>
                <span className="text-gray-300">•</span>
                <div className="flex items-center gap-1">
                  <Icon icon="material-symbols:star" className="w-4 h-4 text-yellow-400" />
                  <span className="font-semibold">{selectedCourse.rating.toFixed(1)}</span>
                  <span className="text-gray-500">
                    ({selectedCourse.student_count > 0 ? `${selectedCourse.student_count.toLocaleString()}+` : '0'} students)
                  </span>
                </div>
              </div>

              {/* Course Description */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">About This Course</h3>
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {stripHtml(selectedCourse.description || '') || 'This course provides comprehensive learning materials designed for Caribbean learners. Explore engaging content, interactive lessons, and expert instruction to enhance your skills and knowledge.'}
                </p>
              </div>

              {/* Enrollment Notice */}
              <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-lg mb-6">
                <div className="flex items-start gap-3">
                  <Icon icon="material-symbols:info" className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-amber-900 mb-2">Self-Enrollment Not Available</h4>
                    <p className="text-amber-800 text-sm leading-relaxed">
                      This organization does not allow self-enrollment in courses. To enroll in this course, please contact your administrator or course coordinator. They will be able to add you to the course.
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-all duration-200"
                >
                  Close
                </button>
                <Link
                  href={`/courses/${selectedCourse.id}`}
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-6 py-3 text-white font-semibold rounded-xl transition-all duration-200 text-center"
                  style={{
                    background: `linear-gradient(to right, var(--theme-primary), var(--theme-secondary))`
                  }}
                >
                  View Course Details
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}