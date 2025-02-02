import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import axiosInstance from '@/lib/axiosInstance';

const UptimeGraph = ({ service }) => {
  const [uptimeData, setUptimeData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUptimeData = async () => {
      try {
        const response = await axiosInstance.get(`/api/services/${service.id}/uptime`);
        setUptimeData(response.data);
      } catch (error) {
        console.error('Error fetching uptime data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUptimeData();
  }, [service.id]);

  const calculateUptime = (data) => {
    if (!data.length) return '100.00';
    const total = data.length;
    const operational = data.filter(d => d.status === 'Operational').length;
    return ((operational / total) * 100).toFixed(2);
  };

  const formattedData = uptimeData.map(d => ({
    timestamp: new Date(d.timestamp).toLocaleDateString(),
    uptime: d.uptime_value
  }));

  if (loading) {
    return <div>Loading uptime data...</div>;
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{service.name} Uptime</span>
          <span className="text-sm font-normal">
            {calculateUptime(uptimeData)}% Uptime
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={formattedData}>
              <Line 
                type="monotone" 
                dataKey="uptime" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                dot={false}
              />
              <XAxis 
                dataKey="timestamp" 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                domain={[0, 100]}
                ticks={[0, 25, 50, 75, 100]}
              />
              <Tooltip />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default UptimeGraph;