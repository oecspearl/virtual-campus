'use client';

import React from 'react';
import Link from 'next/link';
import { Icon } from '@iconify/react';
import { motion } from 'framer-motion';

const VALUES = [
  {
    icon: 'material-symbols:accessibility',
    title: 'Accessibility',
    description: 'Equitable access to quality education for all Caribbean citizens, regardless of location or background.',
  },
  {
    icon: 'material-symbols:handshake',
    title: 'Collaboration',
    description: 'Regional cooperation and knowledge sharing among member states and educational institutions.',
  },
  {
    icon: 'material-symbols:verified',
    title: 'Quality',
    description: 'The highest standards in educational content and platform functionality for effective learning outcomes.',
  },
  {
    icon: 'material-symbols:trending-up',
    title: 'Innovation',
    description: 'Cutting-edge technology and pedagogical approaches that enhance the learning experience.',
  },
];

const MEMBER_STATES = [
  { name: 'Antigua and Barbuda', flag: '🇦🇬' },
  { name: 'Dominica', flag: '🇩🇲' },
  { name: 'Grenada', flag: '🇬🇩' },
  { name: 'Montserrat', flag: '🇲🇸' },
  { name: 'Saint Kitts and Nevis', flag: '🇰🇳' },
  { name: 'Saint Lucia', flag: '🇱🇨' },
  { name: 'Saint Vincent and the Grenadines', flag: '🇻🇨' },
];

const ASSOCIATE_MEMBERS = [
  { name: 'Anguilla', flag: '🇦🇮' },
  { name: 'British Virgin Islands', flag: '🇻🇬' },
  { name: 'Guadeloupe', flag: '🇬🇵' },
  { name: 'Martinique', flag: '🇲🇶' },
];

const TEAM = [
  { name: 'Royston Emmanuel', role: 'Technical Lead' },
  { name: 'Clendon Biscette', role: 'Full Stack Developer' },
  { name: 'Delon Pierre', role: 'Software Engineer' },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-900">
        <div
          className="absolute inset-0 opacity-20"
          aria-hidden="true"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-white text-xs font-medium tracking-wide uppercase mb-6">
              <Icon icon="material-symbols:public" className="w-4 h-4" />
              Official OECS Platform
            </span>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white tracking-tight mb-5">
              About <span className="text-yellow-300">OECS Virtual Campus</span>
            </h1>
            <p className="text-lg md:text-xl text-blue-100 max-w-3xl mx-auto mb-10 leading-relaxed">
              Empowering education across the Caribbean through innovative technology and regional collaboration.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/courses"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-white text-blue-700 font-semibold text-sm hover:bg-blue-50 transition-colors shadow-sm"
              >
                <Icon icon="material-symbols:menu-book" className="w-5 h-5" />
                Browse Courses
              </Link>
              <Link
                href="/auth/signin"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-white/10 backdrop-blur-sm border border-white/30 text-white font-semibold text-sm hover:bg-white/20 transition-colors"
              >
                Sign In
                <Icon icon="material-symbols:arrow-forward" className="w-5 h-5" />
              </Link>
            </div>

            <div className="mt-12 grid grid-cols-3 gap-8 max-w-2xl mx-auto">
              <Stat value="7" label="Member States" />
              <Stat value="4" label="Associate Members" />
              <Stat value="60K+" label="Students Served" />
            </div>
          </motion.div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
        {/* Mission & Vision */}
        <section className="mb-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-start">
            <div>
              <SectionEyebrow>Our Mission</SectionEyebrow>
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight mb-6">
                Bridging educational gaps across the Caribbean
              </h2>
              <p className="text-base lg:text-lg text-gray-600 mb-5 leading-relaxed">
                OECS Virtual Campus is the official Learning Management System of the Organisation of Eastern Caribbean States. We make quality education accessible across the region through a modern, secure platform that empowers students, instructors, and administrators.
              </p>
              <p className="text-base lg:text-lg text-gray-600 mb-8 leading-relaxed">
                We provide a unified platform that supports diverse learning needs, promotes regional collaboration, and ensures equitable access to quality education for all member states.
              </p>
              <div className="flex flex-wrap gap-3">
                <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-100 rounded-lg text-sm font-medium text-blue-800">
                  <Icon icon="material-symbols:verified" className="w-4 h-4" />
                  Official OECS Platform
                </span>
                <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-100 rounded-lg text-sm font-medium text-emerald-800">
                  <Icon icon="material-symbols:security" className="w-4 h-4" />
                  Secure &amp; Reliable
                </span>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 rounded-2xl p-8 lg:p-10 text-white shadow-lg">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-lg bg-white/15 flex items-center justify-center">
                  <Icon icon="material-symbols:rocket-launch" className="w-5 h-5 text-yellow-300" />
                </div>
                <SectionEyebrow tone="light">Our Vision</SectionEyebrow>
              </div>
              <h3 className="text-2xl lg:text-3xl font-bold tracking-tight mb-4">
                The Caribbean&apos;s leading digital education platform.
              </h3>
              <p className="text-blue-100 text-base lg:text-lg leading-relaxed">
                Fostering regional integration and educational excellence while ensuring every citizen has access to world-class learning opportunities.
              </p>
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="mb-20">
          <div className="text-center mb-12">
            <SectionEyebrow center>Our Values</SectionEyebrow>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight mb-4">
              The principles that guide our work
            </h2>
            <p className="text-base lg:text-lg text-gray-600 max-w-2xl mx-auto">
              Four commitments that shape every decision we make.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {VALUES.map(value => (
              <div
                key={value.title}
                className="bg-white rounded-xl p-6 border border-gray-200/80 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
              >
                <div className="w-11 h-11 rounded-lg bg-blue-50 flex items-center justify-center mb-4">
                  <Icon icon={value.icon} className="w-5 h-5 text-blue-700" />
                </div>
                <h3 className="text-base font-semibold text-gray-900 mb-2">{value.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{value.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Member States */}
        <section className="mb-20">
          <div className="text-center mb-12">
            <SectionEyebrow center>The Region</SectionEyebrow>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight mb-4">
              Serving the Eastern Caribbean
            </h2>
            <p className="text-base lg:text-lg text-gray-600 max-w-2xl mx-auto">
              Eleven nations and territories united through education.
            </p>
          </div>

          <div className="space-y-6">
            <MemberGroup label="Member States" items={MEMBER_STATES} />
            <MemberGroup label="Associate Members" items={ASSOCIATE_MEMBERS} subdued />
          </div>
        </section>

        {/* Team */}
        <section className="mb-20">
          <div className="text-center mb-12">
            <SectionEyebrow center>Our Team</SectionEyebrow>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight mb-4">
              The people behind the platform
            </h2>
            <p className="text-base lg:text-lg text-gray-600 max-w-2xl mx-auto">
              The professionals working to advance education across the Caribbean.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {TEAM.map(member => (
              <TeamCard key={member.name} name={member.name} role={member.role} />
            ))}
          </div>
        </section>

        {/* Contact */}
        <section className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 rounded-2xl p-8 md:p-12 text-white shadow-lg">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">Get in Touch</h2>
            <p className="text-blue-100 text-base lg:text-lg max-w-2xl mx-auto">
              Ready to join our mission? Reach out to learn more about OECS Virtual Campus.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <ContactItem icon="material-symbols:mail" label="Email" value="mypdoecs@gmail.com" />
            <ContactItem icon="material-symbols:phone" label="Phone" value="+1 (758) 455-6327" />
            <ContactItem icon="material-symbols:public" label="Website" value="www.oecs.org" href="https://www.oecs.org" />
            <ContactItem icon="material-symbols:location-on" label="Address" value="Morne Fortune, Castries, St. Lucia" />
          </div>
        </section>
      </div>
    </div>
  );
}

function SectionEyebrow({
  children,
  center = false,
  tone = 'dark',
}: {
  children: React.ReactNode;
  center?: boolean;
  tone?: 'dark' | 'light';
}) {
  return (
    <div className={`text-xs font-semibold tracking-widest uppercase mb-3 ${center ? 'text-center' : ''} ${tone === 'light' ? 'text-yellow-300' : 'text-blue-700'}`}>
      {children}
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <div className="text-3xl md:text-4xl font-bold text-white">{value}</div>
      <div className="text-xs md:text-sm text-blue-200 mt-1">{label}</div>
    </div>
  );
}

function MemberGroup({
  label,
  items,
  subdued = false,
}: {
  label: string;
  items: { name: string; flag: string }[];
  subdued?: boolean;
}) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <h3 className="text-sm font-semibold text-gray-700">{label}</h3>
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-xs text-gray-400">{items.length}</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {items.map(item => (
          <div
            key={item.name}
            className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
              subdued
                ? 'bg-gray-50 border-gray-200 hover:bg-white'
                : 'bg-white border-gray-200/80 hover:border-blue-200 hover:bg-blue-50/30'
            }`}
          >
            <span className="text-2xl leading-none flex-shrink-0" aria-hidden="true">{item.flag}</span>
            <span className="text-sm font-medium text-gray-800 leading-tight">{item.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TeamCard({ name, role }: { name: string; role: string }) {
  const initials = name
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200/80 shadow-sm hover:shadow-md transition-all duration-200 text-center">
      <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white text-xl font-bold shadow-sm">
        {initials}
      </div>
      <h3 className="text-base font-semibold text-gray-900 mb-1">{name}</h3>
      <p className="text-sm text-blue-700 font-medium">{role}</p>
    </div>
  );
}

function ContactItem({
  icon,
  label,
  value,
  href,
}: {
  icon: string;
  label: string;
  value: string;
  href?: string;
}) {
  const inner = (
    <>
      <div className="w-10 h-10 mx-auto mb-3 rounded-lg bg-white/15 flex items-center justify-center">
        <Icon icon={icon} className="w-5 h-5" />
      </div>
      <div className="font-semibold text-sm mb-1">{label}</div>
      <div className="text-blue-100 text-sm">{value}</div>
    </>
  );

  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="text-center group">
        {inner}
      </a>
    );
  }

  return <div className="text-center">{inner}</div>;
}
