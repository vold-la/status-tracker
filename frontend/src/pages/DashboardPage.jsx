import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import StatusIndicator from '@/components/ui/StatusIndicator';
import { getAllServices } from '@/services/serviceService';
import { getAllIncidents } from '@/services/incidentService';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

const DashboardPage = () => {
  const [stats, setStats] = useState({
    services: [],
    incidents: [],
    loading: true
  });

  useEffect(() => {
    let mounted = true;

    const fetchData = async () => {
      try {
        const [services, incidents] = await Promise.all([
          getAllServices(),
          getAllIncidents()
        ]);

        if (mounted) {
          setStats({
            services,
            incidents,
            loading: false
          });
        }
      } catch (error) {
        if (mounted) {
          console.error('Error fetching dashboard data:', error);
          setStats(prev => ({ ...prev, loading: false }));
        }
      }
    };

    fetchData();

    return () => {
      mounted = false;
    };
  }, []);

  if (stats.loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container max-w-5xl mx-auto p-6">
      <div className="text-center py-12">
        <h1 className="text-4xl font-bold mb-4">Dashboard Overview</h1>
        <p className="text-muted-foreground">Monitor your system's health and performance</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {['Total Services', 'Active Incidents', 'Service Health'].map((title, i) => (
          <Card key={i} className="bg-white shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {i === 0 && stats.services.length}
                {i === 1 && stats.incidents.filter(i => !i.resolved).length}
                {i === 2 && `${Math.round((stats.services.filter(s => s.status === 'Operational').length / stats.services.length) * 100)}%`}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Recent Incidents</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {stats.incidents.slice(0, 5).map(incident => (
              <div key={incident.id} className="p-4 rounded-lg bg-muted/30">
                <p className="font-medium mb-2">{incident.description}</p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Badge variant={incident.resolved ? 'outline' : 'destructive'}>
                    {incident.status}
                  </Badge>
                  <span>•</span>
                  <time>{new Date(incident.created_at).toLocaleString()}</time>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Service Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {stats.services.map(service => (
              <div key={service.id} className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                <span className="font-medium">{service.name}</span>
                <StatusIndicator status={service.status} />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardPage;