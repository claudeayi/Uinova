export default function MonitoringDashboard() {
  return (
    <div className="w-full h-[600px]">
      <iframe
        src="http://localhost:3000/d/grafana-dashboard/u-inova"
        width="100%"
        height="100%"
        frameBorder="0"
        title="Monitoring"
      />
    </div>
  );
}
