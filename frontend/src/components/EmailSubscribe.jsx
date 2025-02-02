import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import axiosInstance from '@/lib/axiosInstance';
import { Loader2 } from 'lucide-react';

const EmailSubscribe = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('');

  const { toast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const response = await axiosInstance.post('/api/notifications/subscribe', { email });
      setMessage(response.data.message);
      setStatus(response.status === 201 ? 'success' : 'info');
      if (response.status === 201) {
        setEmail('');
      }
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to subscribe");
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex flex-col gap-2">
        <Input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={loading}
          className="w-64"
        />
        {message && (
          <p className={`text-sm ${
            status === 'success' ? 'text-green-600' :
            status === 'info' ? 'text-blue-600' :
            'text-red-600'
          }`}>
            {message}
          </p>
        )}
      </div>
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          "Subscribe"
        )}
      </Button>
    </form>
  );
};

export default EmailSubscribe;