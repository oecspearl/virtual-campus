"use client";

import React from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Icon } from '@iconify/react';

interface EngagementMetricsProps {
  data: {
    date: string;
    logins: number;
    time_spent: number;
    assignments_submitted: number;
    discussions: number;
  }[];
}

export default function EngagementMetrics({ data }: EngagementMetricsProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Engagement Over Time</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="logins" stroke="#3b82f6" name="Logins" />
            <Line type="monotone" dataKey="time_spent" stroke="#10b981" name="Time Spent (hrs)" />
            <Line type="monotone" dataKey="assignments_submitted" stroke="#f59e0b" name="Assignments" />
            <Line type="monotone" dataKey="discussions" stroke="#8b5cf6" name="Discussions" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Activity Distribution</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="logins" fill="#3b82f6" name="Logins" />
            <Bar dataKey="assignments_submitted" fill="#f59e0b" name="Assignments" />
            <Bar dataKey="discussions" fill="#8b5cf6" name="Discussions" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}


