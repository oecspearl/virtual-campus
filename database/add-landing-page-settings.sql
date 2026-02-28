-- Add landing page settings to site_settings table
-- This migration adds all configurable content for the landing page

-- Section Visibility Toggles (all enabled by default)
INSERT INTO site_settings (setting_key, setting_value, setting_type, description) VALUES
  ('homepage_hero_enabled', 'true', 'boolean', 'Enable/disable hero section on homepage'),
  ('homepage_features_enabled', 'true', 'boolean', 'Enable/disable features section on homepage'),
  ('homepage_courses_enabled', 'true', 'boolean', 'Enable/disable courses section on homepage'),
  ('homepage_testimonials_enabled', 'true', 'boolean', 'Enable/disable testimonials section on homepage'),
  ('homepage_cta_enabled', 'true', 'boolean', 'Enable/disable call to action section on homepage'),
  ('logo_header_enabled', 'true', 'boolean', 'Enable/disable header logo display'),
  ('logo_size', '48', 'text', 'Main logo size in pixels (default: 48px)')
ON CONFLICT (setting_key) DO NOTHING;

-- Hero Section Settings
INSERT INTO site_settings (setting_key, setting_value, setting_type, description) VALUES
  ('homepage_hero_description', 'Join the Caribbean''s premier digital learning platform. Access world-class courses, connect with expert instructors, and advance your career with our comprehensive educational ecosystem.', 'text', 'Hero section description text'),
  ('homepage_hero_cta_primary_text', 'Start Learning Free', 'text', 'Primary CTA button text in hero section'),
  ('homepage_hero_cta_secondary_text', 'Explore Courses', 'text', 'Secondary CTA button text in hero section'),
  ('homepage_hero_stat_students', '60K+', 'text', 'Students count stat in hero section'),
  ('homepage_hero_stat_educators', '4,000+', 'text', 'Educators count stat in hero section'),
  ('homepage_hero_stat_countries', '15', 'text', 'Countries count stat in hero section')
ON CONFLICT (setting_key) DO NOTHING;

-- Features Section Settings
INSERT INTO site_settings (setting_key, setting_value, setting_type, description) VALUES
  ('homepage_features_badge', 'Why Choose LearnBoard?', 'text', 'Badge text for features section'),
  ('homepage_features_title', 'Everything You Need to', 'text', 'Main title for features section'),
  ('homepage_features_title_highlight', 'Succeed in Learning', 'text', 'Highlighted part of features section title'),
  ('homepage_features_description', 'Our comprehensive platform provides all the tools and resources you need for effective online learning, teaching, and collaboration across the Caribbean region.', 'text', 'Description text for features section'),
  ('homepage_features', '[
    {
      "icon": "material-symbols:security",
      "title": "Enterprise Security",
      "description": "Bank-level security with role-based access control, data encryption, and compliance with international standards.",
      "color": "from-green-500 to-emerald-600"
    },
    {
      "icon": "material-symbols:groups",
      "title": "Collaborative Learning",
      "description": "Connect with students and instructors across 15 Caribbean countries in real-time discussions and group projects.",
      "color": "from-blue-500 to-cyan-600"
    },
    {
      "icon": "material-symbols:analytics",
      "title": "Advanced Analytics",
      "description": "Comprehensive progress tracking, performance analytics, and personalized learning recommendations.",
      "color": "from-purple-500 to-violet-600"
    },
    {
      "icon": "material-symbols:smart-toy",
      "title": "AI-Powered Learning",
      "description": "Intelligent tutoring system with adaptive learning paths and automated assessment capabilities.",
      "color": "from-orange-500 to-red-500"
    },
    {
      "icon": "material-symbols:mobile-friendly",
      "title": "Mobile First Design",
      "description": "Seamless learning experience across all devices with offline capabilities and sync functionality.",
      "color": "from-indigo-500 to-blue-600"
    },
    {
      "icon": "material-symbols:support-agent",
      "title": "24/7 Support",
      "description": "Round-the-clock technical support and academic assistance from our dedicated Caribbean team.",
      "color": "from-teal-500 to-green-600"
    }
  ]', 'json', 'Array of feature cards for features section')
ON CONFLICT (setting_key) DO NOTHING;

-- Courses Section Settings
INSERT INTO site_settings (setting_key, setting_value, setting_type, description) VALUES
  ('homepage_courses_badge', 'Featured Courses', 'text', 'Badge text for courses section'),
  ('homepage_courses_title', 'Discover Our', 'text', 'Main title for courses section'),
  ('homepage_courses_title_highlight', 'Most Popular Courses', 'text', 'Highlighted part of courses section title'),
  ('homepage_courses_description', 'Hand-picked courses designed specifically for Caribbean students and professionals, covering everything from academic subjects to professional development.', 'text', 'Description text for courses section'),
  ('homepage_courses_cta_text', 'View All Courses', 'text', 'CTA button text for courses section')
ON CONFLICT (setting_key) DO NOTHING;

-- Testimonials Section Settings
INSERT INTO site_settings (setting_key, setting_value, setting_type, description) VALUES
  ('homepage_testimonials_badge', 'What Our Community Says', 'text', 'Badge text for testimonials section'),
  ('homepage_testimonials_title', 'Trusted by', 'text', 'Main title for testimonials section'),
  ('homepage_testimonials_title_highlight', 'Thousands of Learners', 'text', 'Highlighted part of testimonials section title'),
  ('homepage_testimonials_description', 'Hear from students, instructors, and administrators across the Caribbean region who are transforming education with LearnBoard.', 'text', 'Description text for testimonials section'),
  ('homepage_testimonials', '[
    {
      "quote": "LearnBoard has completely transformed how I teach mathematics. The interactive tools and real-time collaboration features have made my students more engaged than ever before.",
      "author": "Mathematics Instructor",
      "role": "Instructor",
      "location": "Antigua and Barbuda",
      "avatar": "MI",
      "rating": 5
    },
    {
      "quote": "As a working professional, I needed flexible learning options. LearnBoard''s mobile-first design and offline capabilities allow me to study anywhere, anytime.",
      "author": "Business Student",
      "role": "Student",
      "location": "St. Lucia",
      "avatar": "BS",
      "rating": 5
    },
    {
      "quote": "The administrative dashboard is incredibly powerful. Managing multiple classes, tracking student progress, and generating reports has never been easier.",
      "author": "Education Director",
      "role": "Administrator",
      "location": "Dominica",
      "avatar": "ED",
      "rating": 5
    },
    {
      "quote": "The AI-powered learning recommendations have helped me identify my weak areas and focus on improving them. It''s like having a personal tutor!",
      "author": "Computer Science Student",
      "role": "Student",
      "location": "Grenada",
      "avatar": "CS",
      "rating": 5
    },
    {
      "quote": "The platform''s security and reliability give me confidence that our students'' data is safe. The 24/7 support team is also incredibly responsive.",
      "author": "IT Administrator",
      "role": "Administrator",
      "location": "Barbados",
      "avatar": "IT",
      "rating": 5
    },
    {
      "quote": "LearnBoard has made it possible for our small island to offer world-class education. The collaborative features connect our students with peers across the region.",
      "author": "School Principal",
      "role": "Administrator",
      "location": "St. Vincent",
      "avatar": "SP",
      "rating": 5
    }
  ]', 'json', 'Array of testimonials for testimonials section')
ON CONFLICT (setting_key) DO NOTHING;

-- Call to Action Section Settings
INSERT INTO site_settings (setting_key, setting_value, setting_type, description) VALUES
  ('homepage_cta_title', 'Ready to Transform Your', 'text', 'Main title for CTA section'),
  ('homepage_cta_title_highlight', 'Learning Experience?', 'text', 'Highlighted part of CTA section title'),
  ('homepage_cta_description', 'Join thousands of Caribbean students and professionals who are already advancing their careers with LearnBoard. Start your journey today!', 'text', 'Description text for CTA section'),
  ('homepage_cta_primary_text', 'Start Learning Free', 'text', 'Primary CTA button text in CTA section'),
  ('homepage_cta_secondary_text', 'Browse Courses', 'text', 'Secondary CTA button text in CTA section')
ON CONFLICT (setting_key) DO NOTHING;

-- Color Theme Settings
INSERT INTO site_settings (setting_key, setting_value, setting_type, description) VALUES
  ('color_theme', 'ocean-blue', 'text', 'Selected color theme for the application'),
  ('color_themes', '{
    "ocean-blue": {
      "name": "Ocean Blue",
      "primary": "#3B82F6",
      "secondary": "#6366F1",
      "accent": "#60A5FA",
      "description": "Professional blue theme perfect for educational platforms"
    },
    "forest-green": {
      "name": "Forest Green",
      "primary": "#10B981",
      "secondary": "#059669",
      "accent": "#34D399",
      "description": "Natural green theme representing growth and learning"
    },
    "sunset-orange": {
      "name": "Sunset Orange",
      "primary": "#F59E0B",
      "secondary": "#D97706",
      "accent": "#FBBF24",
      "description": "Warm orange theme with energetic vibes"
    },
    "royal-purple": {
      "name": "Royal Purple",
      "primary": "#8B5CF6",
      "secondary": "#7C3AED",
      "accent": "#A78BFA",
      "description": "Elegant purple theme for premium experiences"
    },
    "caribbean-teal": {
      "name": "Caribbean Teal",
      "primary": "#14B8A6",
      "secondary": "#0D9488",
      "accent": "#5EEAD4",
      "description": "Fresh teal theme inspired by Caribbean waters"
    }
  }', 'json', 'Available color themes with their color values')
ON CONFLICT (setting_key) DO NOTHING;

-- Footer Settings
INSERT INTO site_settings (setting_key, setting_value, setting_type, description) VALUES
  ('footer_brand_title', 'OECS Digital Learning', 'text', 'Footer brand section title'),
  ('footer_brand_subtitle', 'Ecosystem', 'text', 'Footer brand section subtitle'),
  ('footer_brand_description', 'Transforming Caribbean education through digital innovation and regional collaboration.', 'text', 'Footer brand section description'),
  ('footer_copyright', '© 2025 OECS Commission. All rights reserved.', 'text', 'Footer copyright text'),
  ('footer_newsletter_title', 'Stay Updated', 'text', 'Footer newsletter section title'),
  ('footer_newsletter_description', 'Subscribe to our newsletter for the latest updates, insights, and educational resources.', 'text', 'Footer newsletter section description'),
  ('footer_newsletter_button_text', 'Subscribe', 'text', 'Footer newsletter subscribe button text'),
  ('footer_member_states_title', 'OECS Member States', 'text', 'Footer member states section title'),
  ('footer_member_states_subtitle', 'United in digital education transformation', 'text', 'Footer member states section subtitle'),
  ('footer_social_links', '[
    {
      "platform": "twitter",
      "url": "#",
      "enabled": true
    },
    {
      "platform": "facebook",
      "url": "#",
      "enabled": true
    },
    {
      "platform": "linkedin",
      "url": "#",
      "enabled": true
    },
    {
      "platform": "pinterest",
      "url": "#",
      "enabled": true
    }
  ]', 'json', 'Footer social media links'),
  ('footer_platforms', '[
    {
      "label": "Learning Hub",
      "url": "#",
      "enabled": true
    },
    {
      "label": "MyPD",
      "url": "#",
      "enabled": true
    },
    {
      "label": "Pearl AI",
      "url": "#",
      "enabled": true
    },
    {
      "label": "Knowledge Gateway",
      "url": "#",
      "enabled": true
    }
  ]', 'json', 'Footer platforms links'),
  ('footer_resources', '[
    {
      "label": "Documentation",
      "url": "#",
      "enabled": true
    },
    {
      "label": "Training",
      "url": "#",
      "enabled": true
    },
    {
      "label": "Research",
      "url": "#",
      "enabled": true
    },
    {
      "label": "Support",
      "url": "#",
      "enabled": true
    }
  ]', 'json', 'Footer resources links'),
  ('footer_bottom_links', '[
    {
      "label": "Privacy Policy",
      "url": "#",
      "enabled": true
    },
    {
      "label": "Terms of Service",
      "url": "#",
      "enabled": true
    },
    {
      "label": "Contact Us",
      "url": "#",
      "enabled": true
    },
    {
      "label": "Accessibility",
      "url": "#",
      "enabled": true
    }
  ]', 'json', 'Footer bottom links'),
  ('footer_member_states', '[
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
    "St. Maarten"
  ]', 'json', 'Footer member states list'),
  ('footer_brand_enabled', 'true', 'boolean', 'Enable/disable footer brand section'),
  ('footer_platforms_enabled', 'true', 'boolean', 'Enable/disable footer platforms section'),
  ('footer_resources_enabled', 'true', 'boolean', 'Enable/disable footer resources section'),
  ('footer_newsletter_enabled', 'true', 'boolean', 'Enable/disable footer newsletter section'),
  ('footer_member_states_enabled', 'true', 'boolean', 'Enable/disable footer member states section'),
  ('homepage_featured_course_ids', '[]', 'json', 'Array of course IDs to feature on the homepage (empty array uses automatic featured courses)')
ON CONFLICT (setting_key) DO NOTHING;

