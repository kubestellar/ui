# ITS.tsx that ChatGPT recreated with figma

import { useEffect, useState } from "react";
import { Button, TextField as Input, Badge, Table, TableHead as TableHeader, TableBody, TableRow, TableCell } from "@mui/material";
import { Search, Filter, Plus, Upload } from "lucide-react";

interface ClusterInfo {
  name: string;
  namespace: string;
  labels: string[];
  nodes: number;
  creationDate: string;
  status: "Active" | "Inactive";
}

const ITS = () => {
  const [clusters, setClusters] = useState<ClusterInfo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Simulating API call
    setTimeout(() => {
      setClusters([
        {
          name: "winions-central",
          namespace: "winions-central",
          labels: ["region=aleolia", "cluster-opening"],
          nodes: 2,
          creationDate: "1/24/2025 9:12:18 AM",
          status: "Active",
        },
        {
          name: "cluster1",
          namespace: "cluster1",
          labels: ["app=mod", "cluster-open-mangeme..."],
          nodes: 1,
          creationDate: "1/20/2025 7:42:25 PM",
          status: "Inactive",
        },
        {
          name: "cluster2",
          namespace: "cluster2",
          labels: ["kubestellarVersion", "location-group=edge"],
          nodes: 3,
          creationDate: "1/15/2025 9:12:18 PM",
          status: "Inactive",
        },
        {
          name: "kind",
          namespace: "kind",
          labels: ["devteam=owner", "tier=candybar", "name=beriberi-langnahm"],
          nodes: 1,
          creationDate: "12/24/2025 4:20:50 AM",
          status: "Active",
        },
        {
          name: "coe-ene-eks-west",
          namespace: "coe-ene-eks-west",
          labels: ["environment=daze", "region=us-west-2", "datacenter=deep-core"],
          nodes: 2,
          creationDate: "4/20/2024 6:04:20 AM",
          status: "Active",
        },
        {
          name: "coe-ene-eks-east",
          namespace: "coe-ene-eks-east",
          labels: ["environment=daze", "region=us-east-2", "datacenter=deep-space"],
          nodes: 5,
          creationDate: "4/20/2024 9:04:20 PM",
          status: "Inactive",
        },
      ]);
      setLoading(false);
    }, 1000);
  }, []);

  if (loading) return <p className="text-center text-gray-500">Loading Kubernetes clusters...</p>;
  if (error) return <p className="text-center text-red-500">{error}</p>;

  return (
    <div className="max-w-7xl mx-auto p-6 bg-white rounded-2xl shadow-lg">
      {/* Header Section */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center space-x-3">
          <Input className="w-64" placeholder="Search" icon={<Search size={16} />} />
          <Button variant="outline">
            <Filter size={16} className="mr-2" />
            Filter
          </Button>
        </div>
        <div className="flex space-x-2">
          <Button variant="default">
            <Plus size={16} className="mr-2" />
            Create Cluster
          </Button>
          <Button variant="primary">
            <Upload size={16} className="mr-2" />
            Import Cluster
          </Button>
        </div>
      </div>

      {/* Table Section */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableCell className="font-semibold">Cluster Name</TableCell>
              <TableCell className="font-semibold">Namespace</TableCell>
              <TableCell className="font-semibold">Labels</TableCell>
              <TableCell className="font-semibold">Nodes</TableCell>
              <TableCell className="font-semibold">Creation Date</TableCell>
              <TableCell className="font-semibold">Status</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clusters.map((cluster) => (
              <TableRow key={cluster.name}>
                <TableCell>
                  <a href="#" className="text-blue-500 hover:underline">
                    {cluster.name}
                  </a>
                </TableCell>
                <TableCell>{cluster.namespace}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {cluster.labels.slice(0, 2).map((label, index) => (
                      <Badge key={index} className="bg-blue-100 text-blue-700">
                        {label}
                      </Badge>
                    ))}
                    {cluster.labels.length > 2 && (
                      <span className="text-gray-500 text-xs">+{cluster.labels.length - 2} more</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className="bg-green-100 text-green-700">{cluster.nodes}</Badge>
                </TableCell>
                <TableCell>{cluster.creationDate}</TableCell>
                <TableCell>
                  {cluster.status === "Active" ? (
                    <Badge className="bg-green-100 text-green-700">✓ Active</Badge>
                  ) : (
                    <Badge className="bg-red-100 text-red-700">✗ Inactive</Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Section */}
      <div className="flex justify-between items-center mt-4">
        <p className="text-gray-500">Showing data 1 to 8 of 256K entries</p>
        <div className="flex space-x-1">
          <Button variant="outline">1</Button>
          <Button variant="outline">2</Button>
          <Button variant="outline">3</Button>
          <span className="text-gray-500">...</span>
          <Button variant="outline">40</Button>
        </div>
      </div>
    </div>
  );
};

export default ITS;