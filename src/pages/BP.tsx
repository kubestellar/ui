import { useEffect, useState } from "react";
import { Button, TextField, InputAdornment, Badge, Table, TableHead as TableHeader, TableBody, TableRow, TableCell } from "@mui/material";
import { Search, Filter, Plus, Upload } from "lucide-react";

const Input = TextField;

interface BindingPolicyInfo {
  name: string;
  namespace: string;
  labels: string[];
  clusters: number;
  workload: string;
  creationDate: string;
  status: "Active" | "Inactive";
}

const BP = () => {
  const [bindingPolicies, setBindingPolicies] = useState<BindingPolicyInfo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
//   const [error, setError] = useState<string | null>(null);

//   setError(null);

  useEffect(() => {
    // Simulating API call
    setTimeout(() => {
      setBindingPolicies([
        {
          name: "winions-central",
          namespace: "winions-central",
          labels: ["region=aleolia", "cluster-opening"],
          clusters: 2,
          workload: "workload0",
          creationDate: "1/24/2025 9:12:18 AM",
          status: "Active",
        },
        {
          name: "Map This to That",
          namespace: "my-this-and-that",
          labels: ["app=mod", "cluster-open-mangeme..."],
          clusters: 1,
          workload: "workload1",
          creationDate: "1/20/2025 7:42:25 PM",
          status: "Inactive",
        },
        {
          name: "my nginx app on dev",
          namespace: "nginx",
          labels: ["kubestellarVersion", "location-group=edge"],
          clusters: 3,
          workload: "workload2",
          creationDate: "1/15/2025 9:12:18 PM",
          status: "Inactive",
        },
        {
          name: "my nginx app on prod",
          namespace: "nginx",
          labels: ["devteam=owner", "tier=candybar", "name=beriberi-langnahm"],
          clusters: 1,
          workload: "workload3",
          creationDate: "12/24/2025 4:20:50 AM",
          status: "Active",
        },
        {
          name: "my nginx app on staging",
          namespace: "nginx",
          labels: ["environment=daze", "region=us-west-2", "datacenter=deep-core"],
          clusters: 2,
          workload: "workload4",
          creationDate: "4/20/2024 6:04:20 AM",
          status: "Active",
        },
        {
          name: "new app on dev",
          namespace: "new-app",
          labels: ["environment=daze", "region=us-east-2", "datacenter=deep-space"],
          clusters: 5,
          workload: "workload5",
          creationDate: "4/20/2024 9:04:20 PM",
          status: "Inactive",
        },
      ]);
      setLoading(false);
    }, 1000);
  }, []);

  if (loading) return <p className="text-center text-gray-500">Loading KubeStellar Binding Policies...</p>;
//   if (error) return <p className="text-center text-red-500">{error}</p>;

  return (
    <div className="max-w-7xl mx-auto p-6 bg-white rounded-2xl shadow-lg">
      {/* Header Section */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center space-x-3">
          <Input className="w-64" placeholder="Search" InputProps={{startAdornment: (
      <InputAdornment position="start">
        <Search size={16} />
      </InputAdornment>
    ),
  }} />
          <Button variant="text">
            <Filter size={16} className="mr-2" />
            Filter
          </Button>
        </div>
        <div className="flex space-x-2">
          <Button variant="outlined">
            <Plus size={16} className="mr-2" />
            Create Binding Policy
          </Button>
          <Button variant="contained">
            <Upload size={16} className="mr-2" />
            Import Binding Policy
          </Button>
        </div>
      </div>

      {/* Table Section */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableCell className="font-semibold">Biding Policy Name</TableCell>
              <TableCell className="font-semibold">Namespace</TableCell>
              <TableCell className="font-semibold">Labels</TableCell>
              <TableCell className="font-semibold">Clusters</TableCell>
              <TableCell className="font-semibold">Workload</TableCell>
              <TableCell className="font-semibold">Creation Date</TableCell>
              <TableCell className="font-semibold">Status</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bindingPolicies.map((bindingPolicy) => (
              <TableRow key={bindingPolicy.name}>
                <TableCell>
                  <a href="#" className="text-blue-500 hover:underline">
                    {bindingPolicy.name}
                  </a>
                </TableCell>
                <TableCell>{bindingPolicy.namespace}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {bindingPolicy.labels.slice(0, 2).map((label, index) => (
                      <Badge key={index} className="bg-blue-100 text-blue-700">
                        {label}
                      </Badge>
                    ))}
                    {bindingPolicy.labels.length > 2 && (
                      <span className="text-gray-500 text-xs">+{bindingPolicy.labels.length - 2} more</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className="bg-green-100 text-green-700">{bindingPolicy.clusters}</Badge>
                </TableCell>
                <TableCell>
                  <Badge className="bg-green-100 text-green-700">{bindingPolicy.workload}</Badge>
                </TableCell>
                <TableCell>{bindingPolicy.creationDate}</TableCell>
                <TableCell>
                  {bindingPolicy.status === "Active" ? (
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
          <Button variant="outlined">1</Button>
          <Button variant="outlined">2</Button>
          <Button variant="outlined">3</Button>
          <span className="text-gray-500">...</span>
          <Button variant="outlined">40</Button>
        </div>
      </div>
    </div>
  );
};

export default BP;