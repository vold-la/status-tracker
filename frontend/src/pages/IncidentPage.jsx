import React, { useEffect, useState } from 'react';
import { 
  getAllIncidents, 
  createIncident, 
  updateIncident, 
  deleteIncident 
} from '@/services/incidentService';
import { getAllServices } from '@/services/serviceService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
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

const IncidentPage = () => {
  const [incidents, setIncidents] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [incidentToDelete, setIncidentToDelete] = useState(null);
  const [newIncident, setNewIncident] = useState({
    service_id: '',
    description: '',
    status: 'Ongoing'
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [incidentsData, servicesData] = await Promise.all([
        getAllIncidents(),
        getAllServices()
      ]);
      setIncidents(incidentsData);
      setServices(servicesData);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const data = await createIncident(newIncident);
      setIncidents([...incidents, data]);
      setNewIncident({
        service_id: '',
        description: '',
        status: 'Ongoing'
      });
      toast({
        title: "Success",
        description: "Incident created successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to create incident",
        variant: "destructive",
      });
    }
  };

  const handleStatusUpdate = async (incidentId, newStatus) => {
    try {
      await updateIncident(incidentId, { status: newStatus });
      setIncidents(incidents.map(incident =>
        incident.id === incidentId ? { ...incident, status: newStatus } : incident
      ));
      toast({
        title: "Success",
        description: "Incident status updated",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update incident status",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!incidentToDelete) return;
    
    try {
      await deleteIncident(incidentToDelete.id);
      setIncidents(incidents.filter(incident => incident.id !== incidentToDelete.id));
      setIncidentToDelete(null);
      toast({
        title: "Success",
        description: "Incident deleted successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete incident",
        variant: "destructive",
      });
    }
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
        <h1 className="text-4xl font-bold mb-4">Incident Management</h1>
        <p className="text-muted-foreground">Track and manage service incidents</p>
      </div>

      <Card className="bg-white shadow-sm mb-8">
        <CardHeader>
          <CardTitle>Report New Incident</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <select
                value={newIncident.service_id}
                onChange={(e) => setNewIncident({ ...newIncident, service_id: e.target.value })}
                className="px-3 py-2 rounded-md border border-input bg-transparent"
                required
              >
                <option value="">Select Service</option>
                {services.map(service => (
                  <option key={service.id} value={service.id}>{service.name}</option>
                ))}
              </select>
              
              <select
                value={newIncident.status}
                onChange={(e) => setNewIncident({ ...newIncident, status: e.target.value })}
                className="px-3 py-2 rounded-md border border-input bg-transparent"
                required
              >
                {['Ongoing', 'Resolved', 'Scheduled'].map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
            
            <Input
              value={newIncident.description}
              onChange={(e) => setNewIncident({ ...newIncident, description: e.target.value })}
              placeholder="Incident description"
              required
            />
            
            <Button type="submit" className="w-full">Create Incident</Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-6">
        {incidents.map((incident) => {
          const service = services.find(s => s.id === incident.service_id);
          return (
            <Card key={incident.id} className="bg-white shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold">
                    {service?.name || 'Unknown Service'}
                  </CardTitle>
                  <Badge variant={incident.status === 'Resolved' ? 'outline' : 'destructive'}>
                    {incident.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="mb-4 text-muted-foreground">{incident.description}</p>
                <div className="flex gap-4">
                  <select
                    value={incident.status}
                    onChange={(e) => handleStatusUpdate(incident.id, e.target.value)}
                    className="flex-1 px-3 py-2 rounded-md border border-input bg-transparent"
                  >
                    {['Ongoing', 'Resolved', 'Scheduled'].map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                  <Button 
                    variant="destructive"
                    onClick={() => setIncidentToDelete(incident)}
                  >
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <AlertDialog open={!!incidentToDelete} onOpenChange={() => setIncidentToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this incident.
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

export default IncidentPage;