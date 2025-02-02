import React, { useEffect, useState } from 'react';
import { getAllServices, createService, updateService, deleteService } from '@/services/serviceService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import StatusIndicator from '@/components/ui/StatusIndicator';
import UptimeGraph from '@/components/ui/UptimeGraph';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import axiosInstance from '@/lib/axiosInstance';
import { ChevronUp, ChevronDown } from 'lucide-react';

const SERVICE_STATUSES = ['Operational', 'Degraded', 'Outage'];

const fetchServiceHistory = async (serviceId) => {
  try {
    const response = await axiosInstance.get(`/api/services/${serviceId}/history`);
    return response.data;
  } catch (error) {
    console.error('Error fetching service history:', error);
    return [];
  }
};

const ServicePage = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [serviceToDelete, setServiceToDelete] = useState(null);
  const [newService, setNewService] = useState({ name: '', status: 'Operational' });
  const [serviceHistories, setServiceHistories] = useState({});
  const [minimizedServices, setMinimizedServices] = useState(new Set());
  const { toast } = useToast();
  const { organization } = useAuth();

  useEffect(() => {
    let mounted = true;
    
    const fetchData = async () => {
      try {
        const servicesData = await getAllServices();
        
        if (mounted) {
          setServices(servicesData);
          
          const histories = {};
          await Promise.all(
            servicesData.map(async (service) => {
              const history = await fetchServiceHistory(service.id);
              if (mounted) {
                histories[service.id] = history;
              }
            })
          );
          
          if (mounted) {
            setServiceHistories(histories);
          }
        }
      } catch (error) {
        if (mounted) {
          toast({
            title: "Error",
            description: error.message,
            variant: "destructive",
          });
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      mounted = false;
    };
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    
    if (!organization?.id) {
      toast({
        title: "Error",
        description: "Organization ID is required. Please login again.",
        variant: "destructive",
      });
      return;
    }

    try {
      const serviceData = {
        name: newService.name.trim(),
        status: newService.status,
        organization_id: organization.id
      };

      if (!serviceData.name) {
        toast({
          title: "Error",
          description: "Service name is required",
          variant: "destructive",
        });
        return;
      }

      const data = await createService(serviceData);
      setServices(prev => [...prev, data]);
      setNewService({ name: '', status: 'Operational' });
      
      toast({
        title: "Success",
        description: "Service created successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to create service",
        variant: "destructive",
      });
    }
  };

  const handleStatusUpdate = async (serviceId, newStatus) => {
    try {
      const updatedService = await updateService(serviceId, { status: newStatus });
      
      setServices(prev => prev.map(service => 
        service.id === serviceId ? updatedService : service
      ));
      
      toast({
        title: "Success",
        description: "Service status updated",
      });
      
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!serviceToDelete) return;
    
    try {
      await deleteService(serviceToDelete.id);
      setServices(prev => prev.filter(service => service.id !== serviceToDelete.id));
      setServiceToDelete(null);
      toast({
        title: "Success",
        description: "Service deleted successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

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
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container max-w-5xl mx-auto p-6">
      <div className="text-center py-12">
        <h1 className="text-4xl font-bold mb-4">Service Management</h1>
        <p className="text-muted-foreground">Manage and monitor your services</p>
      </div>

      <Card className="bg-white shadow-sm mb-8">
        <CardHeader>
          <CardTitle>Add New Service</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="flex gap-4">
            <Input
              value={newService.name}
              onChange={(e) => setNewService({ ...newService, name: e.target.value })}
              placeholder="Service name"
              className="flex-1"
            />
            <select
              value={newService.status}
              onChange={(e) => setNewService({ ...newService, status: e.target.value })}
              className="px-3 py-2 rounded-md border border-input bg-transparent"
            >
              {SERVICE_STATUSES.map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
            <Button type="submit">Add Service</Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {services.map((service) => (
          <Card key={service.id} className="bg-white shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex items-center justify-between w-full">
                <CardTitle className="text-base font-semibold">
                  {service.name}
                </CardTitle>
                <div className="flex items-center gap-4">
                  <StatusIndicator status={service.status} />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => toggleMinimize(service.id)}
                    className="h-8 w-8 p-0"
                  >
                    {minimizedServices.has(service.id) ? 
                      <ChevronDown className="h-4 w-4" /> : 
                      <ChevronUp className="h-4 w-4" />
                    }
                  </Button>
                </div>
              </div>
            </CardHeader>
            {!minimizedServices.has(service.id) && (
              <CardContent>
                <div className="space-y-4">
                  <select
                    value={service.status}
                    onChange={(e) => handleStatusUpdate(service.id, e.target.value)}
                    className="w-full px-3 py-2 rounded-md border border-input bg-transparent"
                  >
                    {SERVICE_STATUSES.map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                  <Button 
                    variant="destructive"
                    className="w-full"
                    onClick={() => setServiceToDelete(service)}
                  >
                    Delete Service
                  </Button>
                  <UptimeGraph service={service} />
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      <AlertDialog open={!!serviceToDelete} onOpenChange={() => setServiceToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {serviceToDelete?.name} and all associated incidents.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ServicePage;
