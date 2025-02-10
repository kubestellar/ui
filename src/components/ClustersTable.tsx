import { useState } from "react";
import { Badge, Checkbox, Table, TableContainer, TableHead, TableBody, TableRow, TableCell, Paper } from "@mui/material";

interface ManagedClusterInfo {
    name: string;
    labels: { [key: string]: string };
    creationTime: string;
    status: string;
}

interface ClustersTableProps {
    clusters: ManagedClusterInfo[];
}

const ClustersTable: React.FC<ClustersTableProps> = ({ clusters, currentPage, totalPages, onPageChange }) => {
    const [selectAll, setSelectAll] = useState(false);
    const [selectedClusters, setSelectedClusters] = useState<string[]>([]);

    const handleCheckboxChange = (clusterName: string) => {
        setSelectedClusters((prev) =>
            prev.includes(clusterName)
                ? prev.filter((name) => name !== clusterName)
                : [...prev, clusterName]
        );
    };

    const handleSelectAll = () => {
        if (selectAll) {
            setSelectedClusters([]);
        } else {
            setSelectedClusters(clusters.map((cluster) => cluster.name));
        }
        setSelectAll(!selectAll);
    };

    return (
        <div>
            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>
                                <Checkbox checked={selectAll} onChange={handleSelectAll} />
                            </TableCell>
                            <TableCell>Name</TableCell>
                            <TableCell>Labels</TableCell>
                            <TableCell>Creation Time</TableCell>
                            <TableCell>Cluster Size</TableCell>
                            <TableCell>Status</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {clusters.map((cluster) => (
                            <TableRow key={cluster.name}>
                                <TableCell>
                                    <Checkbox
                                        checked={selectedClusters.includes(cluster.name)}
                                        onChange={() => handleCheckboxChange(cluster.name)}
                                    />
                                </TableCell>
                                <TableCell>{cluster.name}</TableCell>
                                <TableCell> {cluster.labels && Object.keys(cluster.labels).length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                        {Object.entries(cluster.labels).map(([key, value]) => (
                                            <span key={`${key}-${value}`} className="bg-blue-200 text-blue-800 px-2 py-1 rounded text-sm">
                                                {key}={value}
                                            </span>
                                        ))}
                                    </div>
                                ) : (
                                    <p>No labels</p>
                                )}
                                </TableCell>
                                <TableCell>{new Date(cluster.creationTime).toLocaleString()}</TableCell>
                                <TableCell>
                                    <Badge className="px-2 py-2 text-sm rounded-lg" style={{ border: "2px solid #9CCBA3", backgroundColor: "#D9F1D5", color: "#00000" }}>
                                        N/A {/* Placeholder for cluster size */}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <Badge className="font-bold px-2 py-1 text-sm rounded" style={{ border: "2px solid #9CCBA3", backgroundColor: "#D9F1D5", color: "#1B7939" }}>
                                        Active✓
                                    </Badge>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                {/* Pagination Controls (outside the table) */}
                <div className="pagination">
                    <button disabled={currentPage === 1} onClick={() => onPageChange(currentPage - 1)}>
                        Previous
                    </button>
                    <span>Page {currentPage} of {totalPages}</span>
                    <button disabled={currentPage === totalPages} onClick={() => onPageChange(currentPage + 1)}>
                        Next
                    </button>
                </div>
            </TableContainer >
        </div>
    );
};

export default ClustersTable;
