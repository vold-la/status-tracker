const StatusIndicator = ({ status }) => {
  const colors = {
    Operational: 'bg-status-operational',
    Degraded: 'bg-status-degraded',
    Outage: 'bg-status-outage'
  };

  const texts = {
    Operational: 'text-status-operational',
    Degraded: 'text-status-degraded', 
    Outage: 'text-status-outage'
  };

  return (
    <div className="flex items-center gap-2">
      <div className={`w-2 h-2 rounded-full ${colors[status]}`} />
      <span className={`text-sm font-medium ${texts[status]}`}>
        {status}
      </span>
    </div>
  );
};

export default StatusIndicator;