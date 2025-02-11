import { useState } from "react";
import { Badge, Button, Checkbox, FormControl, InputAdornment, InputLabel, MenuItem, Select, Table, TableContainer, TableHead, TableBody, TableRow, TableCell, TextField, Paper, SelectChangeEvent } from "@mui/material";
import SearchIcon from '@mui/icons-material/Search';

interface ManagedClusterInfo {
    name: string;
    labels: { [key: string]: string };
    creationTime: string;
    status: string;
}

interface ClustersTableProps {
    clusters: ManagedClusterInfo[];
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}

const ClustersTable: React.FC<ClustersTableProps> = ({ clusters, currentPage, totalPages, onPageChange }) => {
    const [query, setQuery] = useState('');
    const [filteredClusters, setFilteredClusters] = useState<ManagedClusterInfo[]>(clusters);
    const [filter, setFilter] = useState<string>('');
    const [selectAll, setSelectAll] = useState(false);
    const [selectedClusters, setSelectedClusters] = useState<string[]>([]);

    const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setQuery(event.target.value);
    };

    const handleSearchSubmit = () => {
        const filtered = clusters.filter(cluster =>
            cluster.name.toLowerCase().includes(query.toLowerCase())
        );
        setFilteredClusters(filtered);
    };

    const handleFilterChange = (event: SelectChangeEvent<string>) => {
        setFilter(event.target.value as string);
    };


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
            {/* Inline Search Bar */}
            <TextField
                label="Search"
                value={query}
                onChange={handleSearchChange}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchSubmit()}
                variant="outlined"
                sx={{ width: '600' }}
                InputProps={{
                    startAdornment: (
                        <InputAdornment position="start">
                            <SearchIcon/>
                        </InputAdornment>
                    ),
                }}
            />

            {/*Filter*/}
            <FormControl sx={{ minWidth: 120 }}>
                <InputLabel>Filter</InputLabel>
                <Select
                    value={filter}
                    label="Filter"
                    onChange={handleFilterChange}
                >
                    <MenuItem value="">None</MenuItem>
                    <MenuItem value="active">Active</MenuItem>
                    <MenuItem value="inactive">Inactive</MenuItem>
                    <MenuItem value="pending">Pending</MenuItem>
                </Select>
            </FormControl>

            <Button variant="contained" color="primary">
                Create Cluster
            </Button>
            <Button variant="outlined" color="secondary">
                Import Cluster
            </Button>

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
                        {filteredClusters.map((cluster) => (
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
