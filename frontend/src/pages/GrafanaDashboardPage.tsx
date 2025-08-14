import React from 'react';

const GrafanaDashboardPage: React.FC = () => {
  return (
    <div className="p-4">
      <h1 className="mb-4 text-2xl font-bold">Grafana Dashboard</h1>
      <iframe
        src="http://localhost:3000/goto/uDnbbi_NR?orgId=1"
        width="100%"
        height="800"
        className="border-0"
      ></iframe>
    </div>
  );
};

export default GrafanaDashboardPage;
