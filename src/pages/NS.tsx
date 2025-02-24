import { useEffect, useState } from "react";
import { 
    Container, Typography, TextField, Button, Table, TableBody, TableCell, 
    TableContainer, TableHead, TableRow, Paper, IconButton, Snackbar, Alert, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle
} from "@mui/material"; 
import { Delete, Edit } from "@mui/icons-material";
import axios from "axios";
import Editor from "@monaco-editor/react";

interface Namespace {
    name: string;
}

const NameSpace = () => {
    const [namespaces, setNamespaces] = useState<Namespace[]>([]);
    const [name, setName] = useState("");
    const [loading, setLoading] = useState(false);
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" | "warning" | "info" }>({
        open: false,
        message: "",
        severity: "success",
    });
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [selectedNamespace, setSelectedNamespace] = useState<string | null>(null);
    const [editorContent, setEditorContent] = useState('{}');
    const [deletingNamespaces, setDeletingNamespaces] = useState<string[]>([]);
    const [clusterName, setClusterName] = useState<string>("");
    const [currentContext, setCurrentContext] = useState<string>("");


    useEffect(() => {
        fetchNamespaces();
        fetchClusterInfo();
    }, []);

    const fetchNamespaces = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${process.env.VITE_BASE_URL}/api/namespaces`);
            setNamespaces(response.data.namespaces || []);
        } catch (error) {
            console.error("Error fetching namespaces:", error);
            setNamespaces([]);
        } finally {
            setLoading(false);
        }
    };
    const fetchClusterInfo = async () => {
        try {
            const response = await axios.get(`${process.env.VITE_BASE_URL}/api/clusters`);
            console.log("Cluster Info Response:", response.data.clusters[0]); // Debugging line
            setClusterName(response.data.clusters[0] || "Unknown");
            setCurrentContext(response.data.currentContext || "Unknown");
        } catch (error) {
            console.error("Error fetching cluster info:", error);
            console.log(error);
        }
    };
    

    const handleCreate = async () => {
        try {
            await axios.post(`${process.env.VITE_BASE_URL}/api/namespaces/create`, { name });
            showSnackbar("Namespace created successfully", "success");
            fetchNamespaces();
            setName("");
            window.location.reload();
        } catch (error) {
            showSnackbar("Error creating namespace", "error");
            console.error("Error:", error);
        }
    };

    const handleDelete = async (nsName: string) => {
        setDeletingNamespaces((prev) => [...prev, nsName]); // Mark as deleting
        try {
            await axios.delete(`${process.env.VITE_BASE_URL}/api/namespaces/delete/${nsName}`);
            
            // Wait until the namespace is fully deleted
            let isDeleted = false;
            while (!isDeleted) {
                await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2 seconds
                const response = await axios.get(`${process.env.VITE_BASE_URL}/api/namespaces`);
                if (!response.data.namespaces.some((ns: Namespace) => ns.name === nsName)) {
                    isDeleted = true;
                }
            }
    
            showSnackbar("Namespace deleted successfully", "success");
            fetchNamespaces();
        } catch (error) {
            showSnackbar("Error deleting namespace", "error");
            console.error("Error:", error);
        } finally {
            setDeletingNamespaces((prev) => prev.filter((name) => name !== nsName)); // Remove from deleting state
        }
    };
    
    const handleEdit = (nsName: string) => {
        setSelectedNamespace(nsName);
        setEditorContent(JSON.stringify({ labels: { key: "value" } }, null, 2)); // Default structure
        setEditDialogOpen(true);
    };

    const handleSaveEdit = async () => {
        try {
            const parsedData = JSON.parse(editorContent);
            await axios.put(`${process.env.VITE_BASE_URL}/api/namespaces/update/${selectedNamespace}`, parsedData);
            showSnackbar("Namespace labels updated successfully", "success");
            fetchNamespaces();
            setEditDialogOpen(false);
            window.location.reload();
        } catch (error) {
            showSnackbar("Error updating namespace labels", "error");
            console.error("Error:", error);
        }
    };

    const showSnackbar = (message: string, severity: "success" | "error") => {
        setSnackbar({ open: true, message, severity });
    };

    return (
        <Container>
            <Typography variant="h4" gutterBottom>Namespace Management</Typography>
            <TextField
                label="Namespace Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                fullWidth
                margin="normal"
            />
            <Button variant="contained" color="primary" onClick={handleCreate} sx={{ mt: 2 }}>
                Create Namespace
            </Button>

            {loading ? (
                <Container sx={{ textAlign: "center", mt: 3 }}>
                    <CircularProgress />
                </Container>
            ) : (
                <TableContainer component={Paper} sx={{ marginTop: 3 }}>
                    <Table>
                        <TableHead>
                            <TableRow>
                            <TableCell sx={{ fontWeight: 'bold' }}>Namespace</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Cluster-Context</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', textAlign: 'right' }}>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {namespaces.length > 0 ? (
                                namespaces.map((ns) => (
                                    <TableRow key={ns.name}>
                                        <TableCell>{ns.name}</TableCell>
                                        <TableCell>{clusterName}-{currentContext}</TableCell>
                                        <TableCell sx={{ textAlign: 'right' }}>
                                            {deletingNamespaces.includes(ns.name) ? (
                                                <CircularProgress size={24} />
                                            ) : (
                                                <>
                                                    <IconButton color="primary" onClick={() => handleEdit(ns.name)}>
                                                        <Edit />
                                                    </IconButton>
                                                    <IconButton color="error" onClick={() => handleDelete(ns.name)}>
                                                        <Delete />
                                                    </IconButton>
                                                </>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={3} align="center">No namespaces found</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {/* Snackbar Notification */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={3000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
                anchorOrigin={{ vertical: "top", horizontal: "center" }}
            >
                <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: "100%" }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>

            {/* Edit Dialog with Monaco Editor */}
            <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} fullWidth maxWidth="md">
                <DialogTitle>Edit Namespace Labels</DialogTitle>
                <DialogContent>
                    <Editor
                        height="300px"
                        defaultLanguage="json"
                        value={editorContent}
                        onChange={(value) => setEditorContent(value || '{}')}
                        options={{ minimap: { enabled: false } }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setEditDialogOpen(false)} color="secondary">Cancel</Button>
                    <Button onClick={handleSaveEdit} color="primary">Save</Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
};

export default NameSpace;
