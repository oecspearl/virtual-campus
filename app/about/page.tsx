'use client';

import React from 'react';
import { Icon } from '@iconify/react';
import { motion } from 'framer-motion';

export default function AboutPage() {
  const values = [
    {
      icon: 'material-symbols:accessibility',
      title: 'Accessibility',
      description: 'Ensuring equitable access to quality education for all Caribbean citizens, regardless of location or background.'
    },
    {
      icon: 'material-symbols:handshake',
      title: 'Collaboration',
      description: 'Fostering regional cooperation and knowledge sharing among member states and educational institutions.'
    },
    {
      icon: 'material-symbols:verified',
      title: 'Quality',
      description: 'Maintaining the highest standards in educational content and platform functionality to ensure effective learning outcomes.'
    },
    {
      icon: 'material-symbols:trending-up',
      title: 'Innovation',
      description: 'Embracing cutting-edge technology and pedagogical approaches to enhance the learning experience.'
    }
  ];


  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-indigo-700 to-purple-800"></div>
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        ></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
              About <span className="text-yellow-300">OECS LearnBoard</span>
            </h1>
            <p className="text-xl md:text-2xl text-blue-100 max-w-4xl mx-auto mb-8">
              Empowering education across the Caribbean through innovative technology and regional collaboration.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-6 py-3 text-white"
              >
                <Icon icon="material-symbols:public" className="inline w-5 h-5 mr-2" />
                <span className="font-medium">12 Member States</span>
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-6 py-3 text-white"
              >
                <Icon icon="material-symbols:school" className="inline w-5 h-5 mr-2" />
                <span className="font-medium">60K+ Students</span>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Mission & Vision Section */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mb-20"
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                Our <span className="text-blue-600">Mission</span>
              </h2>
              <p className="text-lg text-gray-600 mb-6 leading-relaxed">
                OECS LearnBoard is the official Learning Management System of the Organisation of Eastern Caribbean States. We aim to make quality education accessible across the Caribbean through a modern, secure platform that empowers students, instructors, and administrators throughout the region.
              </p>
              <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                Our mission is to bridge educational gaps across the Caribbean by providing a unified platform that supports diverse learning needs, promotes regional collaboration, and ensures equitable access to quality education for all member states.
              </p>
              <div className="flex flex-wrap gap-4">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2 flex items-center"
                >
                  <Icon icon="material-symbols:verified" className="w-5 h-5 text-blue-600 mr-2" />
                  <span className="text-blue-800 font-medium">Official OECS Platform</span>
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="bg-green-50 border border-green-200 rounded-xl px-4 py-2 flex items-center"
                >
                  <Icon icon="material-symbols:security" className="w-5 h-5 text-green-600 mr-2" />
                  <span className="text-green-800 font-medium">Secure & Reliable</span>
                </motion.div>
              </div>
            </div>
            <div className="relative">
              <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-8 text-white">
                <h3 className="text-2xl font-bold mb-4">Our Vision</h3>
                <p className="text-blue-100 text-lg leading-relaxed">
                  To become the leading digital education platform in the Caribbean, fostering regional integration and educational excellence while ensuring every citizen has access to world-class learning opportunities.
                </p>
                <div className="mt-6 flex items-center">
                  <Icon icon="material-symbols:star" className="w-6 h-6 text-yellow-300 mr-2" />
                  <span className="font-semibold">Excellence in Education</span>
                </div>
              </div>
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-yellow-300 rounded-full flex items-center justify-center">
                <Icon icon="material-symbols:lightbulb" className="w-12 h-12 text-gray-800" />
              </div>
            </div>
          </div>
        </motion.section>

        {/* Values Section */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="mb-20"
        >
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Our <span className="text-blue-600">Values</span>
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              The principles that guide our mission and drive our commitment to educational excellence.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {values.map((value, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: index % 2 === 0 ? -30 : 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.8 + index * 0.1 }}
                whileHover={{ y: -5 }}
                className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100"
              >
                <div className="flex items-start">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mr-4 flex-shrink-0">
                    <Icon icon={value.icon} className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-3">{value.title}</h3>
                    <p className="text-gray-600 leading-relaxed">{value.description}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>


        {/* Team Section */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="mb-20"
        >
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Meet Our <span className="text-blue-600">Team</span>
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              The dedicated professionals working to advance education across the Caribbean region.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <TeamCard name="Royston Emmanuel" role="Technical Lead" id="1" />
            <TeamCard name="Clendon Biscette" role="Full Stack Developer" id="2" />
            <TeamCard name="Delon Pierre" role="Software Engineer" id="3" />
          </div>
        </motion.section>

        {/* Contact Section */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.0 }}
          className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-8 md:p-12 text-white"
        >
          <div className="text-center mb-8">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Get in Touch</h2>
            <p className="text-blue-100 text-lg max-w-2xl mx-auto">
              Ready to join our mission? Contact us to learn more about OECS LearnBoard and how we can support your educational goals.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <Icon icon="material-symbols:mail" className="w-8 h-8 mx-auto mb-3" />
              <div className="font-semibold mb-1">Email</div>
              <div className="text-blue-100 text-sm">mypdoecs@gmail.com</div>
            </div>
            <div className="text-center">
              <Icon icon="material-symbols:phone" className="w-8 h-8 mx-auto mb-3" />
              <div className="font-semibold mb-1">Phone</div>
              <div className="text-blue-100 text-sm">+1 (758) 455-6327</div>
            </div>
            <div className="text-center">
              <Icon icon="material-symbols:public" className="w-8 h-8 mx-auto mb-3" />
              <div className="font-semibold mb-1">Website</div>
              <div className="text-blue-100 text-sm">www.oecs.org</div>
            </div>
            <div className="text-center">
              <Icon icon="material-symbols:location-on" className="w-8 h-8 mx-auto mb-3" />
              <div className="font-semibold mb-1">Address</div>
              <div className="text-blue-100 text-sm">Morne Fortune, Castries, St. Lucia</div>
            </div>
          </div>
        </motion.section>
      </div>
    </div>
  );
}

function TeamCard({ name, role, id }: { name: string; role: string; id: string }) {
  return (
    <motion.div
      whileHover={{ y: -10, scale: 1.02 }}
      className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 text-center border border-gray-100 group"
    >
      <div className="relative mb-6">
        <img 
          src="/avatar.png" 
          alt={`${name} headshot`} 
          className="h-24 w-24 rounded-full object-cover mx-auto border-4 border-gray-100 group-hover:border-blue-200 transition-colors duration-300" 
        />
        <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
          <Icon icon="material-symbols:verified" className="w-4 h-4 text-white" />
        </div>
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-2">{name}</h3>
      <p className="text-blue-600 font-semibold mb-4">{role}</p>
      <div className="flex justify-center space-x-3">
        <motion.a
          href="#"
          whileHover={{ scale: 1.1 }}
          className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 hover:bg-blue-100 hover:text-blue-600 transition-colors"
        >
          <Icon icon="mdi:linkedin" className="w-4 h-4" />
        </motion.a>
        <motion.a
          href="#"
          whileHover={{ scale: 1.1 }}
          className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 hover:bg-blue-100 hover:text-blue-600 transition-colors"
        >
          <Icon icon="mdi:twitter" className="w-4 h-4" />
        </motion.a>
        <motion.a
          href="#"
          whileHover={{ scale: 1.1 }}
          className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 hover:bg-blue-100 hover:text-blue-600 transition-colors"
        >
          <Icon icon="mdi:email" className="w-4 h-4" />
        </motion.a>
    </div>
    </motion.div>
  );
}
