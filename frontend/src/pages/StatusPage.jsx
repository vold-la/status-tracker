import React, { useEffect, useState } from 'react';
import { getAllServices, createService, updateService, deleteService } from '@/services/serviceService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import StatusIndicator from '@/components/ui/StatusIndicator';
import UptimeGraph from '@/components/ui/UptimeGraph';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, AlertTriangle, XCircle, ChevronUp, ChevronDown } from 'lucide-react';
import socketService from './socketService';
import axiosInstance from '@/lib/axiosInstance';

const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric', 
    month: 'long',
    day: 'numeric'
  });
};

const formatTime = (date) => {
  return new Date(date).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

const groupIncidentsByDate = (incidents) => {
  return incidents.reduce((groups, incident) => {
    const date = new Date(incident.created_at).toISOString().split('T')[0];
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(incident);
    return groups;
  }, {});
};

const StatusPage = () => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [minimizedServices, setMinimizedServices] = useState(new Set());

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await axiosInstance.get('/api/status');
        setStatus(response.data);
      } catch (error) {
        console.error('Error fetching status:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
    
    const socket = socketService.connect();
    
    socket.on('service_status_changed', (updatedService) => {
      setStatus(prevStatus => ({
        ...prevStatus,
        services: prevStatus.services.map(service =>
          service.id === updatedService.service_id
            ? { ...service, status: updatedService.status }
            : service
        )
      }));

      toast({
        title: "Status Updated",
        description: `${updatedService.name} status changed to ${updatedService.status}`,
      });
    });

    return () => {
      socketService.disconnect();
    };
  }, []);

  const toggleMinimize = (serviceId) => {
    setMinimizedServices(prev => {
      const newSet = new Set(prev);
      if (newSet.has(serviceId)) {
        newSet.delete(serviceId);
      } else {
        newSet.add(serviceId);
      }
      return newSet;
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-status-background">
      <div className="container max-w-5xl mx-auto p-6">
        <div className="flex flex-col md:flex-row justify-between items-center py-12 gap-6">
          <div>
            <h1 className="text-4xl font-bold mb-4">System Status</h1>
            <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <div className={`w-2 h-2 rounded-full ${
                status?.overall_status === 'Operational' 
                  ? 'bg-status-operational' 
                  : 'bg-status-outage'
              }`} />
              <span>
                {status?.overall_status === 'Operational' 
                  ? 'All Systems Operational'
                  : 'Some Systems Are Experiencing Issues'}
              </span>
            </div>
          </div>
          
          
        </div>

        <div className="grid gap-4 mb-8">
          {status?.services?.map((service) => (
            <div 
              key={service.id}
              className="bg-white rounded-lg shadow-sm border p-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-medium">{service.name}</h3>
                <div className="flex items-center gap-2">
                  <StatusIndicator status={service.status} />
                  <button
                    onClick={() => toggleMinimize(service.id)}
                    className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    {minimizedServices.has(service.id) 
                      ? <ChevronDown className="h-4 w-4" />
                      : <ChevronUp className="h-4 w-4" />
                    }
                  </button>
                </div>
              </div>
              
              <div className={`mt-4 space-y-3 transition-all duration-200 ${
                minimizedServices.has(service.id) ? 'hidden' : 'block'
              }`}>
                {service.incidents?.length > 0 && (
                  <div className="space-y-3">
                    {service.incidents.map((incident) => (
                      <div 
                        key={incident.id}
                        className="bg-muted/30 rounded p-3 text-sm"
                      >
                        <div className="flex justify-between gap-4">
                          <p>{incident.description}</p>
                          <Badge variant={incident.resolved ? 'outline' : 'destructive'}>
                            {incident.status}
                          </Badge>
                        </div>
                        <time className="block mt-2 text-xs text-muted-foreground">
                          {new Date(incident.created_at).toLocaleString()}
                        </time>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-semibold mb-4">Past Incidents</h2>
          <div className="space-y-8">
            {Object.entries(groupIncidentsByDate(status?.incidents || [])).map(([date, incidents]) => (
              <div key={date}>
                <h3 className="text-sm font-medium text-muted-foreground mb-3">
                  {formatDate(date)}
                </h3>
                <div className="space-y-4">
                  {incidents.map((incident) => (
                    <div key={incident.id} className="pl-4 border-l-2 border-muted">
                      <p className="font-medium">{incident.description}</p>
                      <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{incident.status}</span>
                        <span>•</span>
                        <time>{formatTime(incident.created_at)}</time>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatusPage;