import { Box,Typography, Checkbox, MenuItem, Dialog, DialogTitle, DialogContent, DialogActions, Button,Menu } from "@mui/material";
import  { AxiosError } from "axios";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { MoreVerticalIcon } from "lucide-react";
import { useState, useCallback } from "react";
import toast from "react-hot-toast";
import type { Deployment } from "./HelmTab";
import { api } from "../../../lib/api";


interface Props {
    handleChartSelection: (chart: string) => void;
    setUserCharts: React.Dispatch<React.SetStateAction<Deployment[]>>;
    theme: string;
    selectedChart: string | null
    userLoading: boolean;
    userCharts : Deployment[];
}

export const UserCreatedChartsForm = ({ handleChartSelection, setUserCharts, theme, selectedChart, userLoading, userCharts }: Props) => {
    const [contextMenu, setContextMenu] = useState<{ chartId: string; x: number; y: number } | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);
    const [deleteChartId, setDeleteChartId] = useState<string | null>(null);

    const handleMenuOpen = useCallback((event: React.MouseEvent, chartId: string) => {
        event.preventDefault();
        event.stopPropagation();
        setContextMenu({ chartId, x: event.clientX, y: event.clientY });
    }, []);

    const handleMenuClose = useCallback(() => {
        setContextMenu(null);
    }, []);

    const handleDeleteChart = useCallback(async (chartId: string) => {
        try {
            const response = await api.delete(`/api/deployments/helm/${chartId}`);
            if (response.status === 200) {
                setUserCharts(prev => prev.filter(chart => chart.id !== chartId));
                toast.success(`Chart ${chartId} deleted successfully!`);
            } else {
                toast.error(`Chart ${chartId} not deleted!`);
            }
        } catch (error: unknown) {
            const err = error as AxiosError;
            console.error("Delete Chart error:", err);
            toast.error(`Chart ${chartId} not deleted!`);
        } finally {
            setDeleteDialogOpen(false);
            setDeleteChartId(null);
        }
    }, [setUserCharts]);

    const handleDeleteClick = useCallback(() => {
        if (contextMenu?.chartId) {
            setDeleteChartId(contextMenu.chartId);
            setDeleteDialogOpen(true);
        }
        handleMenuClose();
    }, [contextMenu, handleMenuClose, setDeleteChartId, setDeleteDialogOpen]);

    const handleDeleteConfirm = useCallback(() => {
        if (deleteChartId) {
            handleDeleteChart(deleteChartId);
        }
    }, [deleteChartId, handleDeleteChart]);

    const handleDeleteCancel = useCallback(() => {
        setDeleteDialogOpen(false);
        setDeleteChartId(null);
    }, []);

    return (
        <Box
            sx={{
                display: "flex",
                flexDirection: "column",
                flex: 1,
                overflow: "hidden",
                height: "55vh",
            }}
            onClick={handleMenuClose} // Close menu when clicking outside
        >
            {/* Sticky Header */}
            <Box
                sx={{
                    position: "sticky",
                    top: 0,
                    zIndex: 1,
                }}
            >
                {selectedChart && (
                    <Box
                        sx={{
                            width: "100%",
                            margin: "0 auto 25px auto",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            p: 1.6,
                            borderRadius: "4px",
                            border: "1px solid",
                            borderColor: theme === "dark" ? "#444" : "#e0e0e0",
                        }}
                    >
                        <Box sx={{ display: "flex", alignItems: "center" }}>
                            <CheckCircleIcon color="success" sx={{ mr: 1 }} />
                            <Typography variant="body1" sx={{ color: theme === "dark" ? "#fff" : "#333" }}>
                                <strong>{selectedChart}</strong>
                            </Typography>
                        </Box>
                    </Box>
                )}
            </Box>

            {/* Scrollable List */}
            <Box
                sx={{
                    flex: 1,
                    overflowY: "auto",
                    "&::-webkit-scrollbar": {
                        display: "none",
                    },
                    scrollbarWidth: "none",
                    "-ms-overflow-style": "none",
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                }}
            >
                {userLoading ? (
                    <Typography sx={{ color: theme === "dark" ? "#d4d4d4" : "#333", textAlign: "center" }}>
                        Loading user charts...
                    </Typography>
                ) : userCharts.length > 0 ? (
                    userCharts.map((chart) => (
                        <Box
                            key={chart.id}
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                padding: "8px",
                                borderRadius: "4px",
                                backgroundColor: theme === "dark" ? "#00000033" : "#f9f9f9",
                                "&:hover": {
                                    backgroundColor: theme === "dark" ? "#2a2a2a" : "#f1f1f1",
                                },
                            }}
                        >
                            <Box sx={{ display: "flex", alignItems: "center" }} onClick={(e) => e.stopPropagation()}>
                                <Checkbox
                                    checked={selectedChart === chart.chartName}
                                    onChange={() => handleChartSelection(chart.id)}
                                    sx={{
                                        color: theme === "dark" ? "#d4d4d4" : "#666",
                                        "&.Mui-checked": {
                                            color: "#1976d2",
                                        },
                                    }}
                                />
                                <Typography
                                    sx={{
                                        fontSize: "0.875rem",
                                        color: theme === "dark" ? "#d4d4d4" : "#333",
                                    }}
                                >
                                    {chart.id}
                                </Typography>
                            </Box>
                            <Box
                                sx={{ cursor: "pointer" }}
                                onClick={(e) => handleMenuOpen(e, chart.id)}
                            >
                                <MoreVerticalIcon
                                    style={{ color: theme === "dark" ? "#d4d4d4" : "#666" }}
                                />
                            </Box>
                        </Box>
                    ))
                ) : (
                    <Typography sx={{ color: theme === "dark" ? "#d4d4d4" : "#333", textAlign: "center" }}>
                        No user-created charts available.
                    </Typography>
                )}
            </Box>

            {contextMenu && (
                <Menu
                    open={Boolean(contextMenu)}
                    onClose={handleMenuClose}
                    anchorReference="anchorPosition"
                    anchorPosition={contextMenu ? { top: contextMenu.y, left: contextMenu.x } : undefined}
                >
                    <MenuItem onClick={handleDeleteClick}>Delete</MenuItem>
                </Menu>
            )}

            <Dialog
                open={deleteDialogOpen}
                onClose={handleDeleteCancel}
                aria-labelledby="delete-confirmation-dialog-title"
                sx={{
                    "& .MuiDialog-paper": {
                        padding: "16px",
                        width: "500px",
                        backgroundColor: theme === "dark" ? "rgb(15, 23, 42)" : "#fff",
                        borderRadius: "4px",
                        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.1)",
                        maxWidth: "480px",
                        height: "250px",
                    },
                }}
            >
                <DialogTitle id="delete-confirmation-dialog-title" sx={{ display: "flex", alignItems: "center", gap: 1, fontSize: "18px", fontWeight: 600, color: theme === "dark" ? "#fff" : "333" }}>
                    <WarningAmberIcon sx={{ color: "#FFA500", fontSize: "34px" }} />
                    Confirm Resource Deletion
                </DialogTitle>
                <DialogContent>
                    <Typography sx={{ fontSize: "16px", color: theme === "dark" ? "#fff" : "333", mt: 2 }}>
                        Are you sure you want to delete "{deleteChartId}"? This action cannot be undone.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ justifyContent: "space-between", padding: "0 16px 16px 16px" }}>
                    <Button
                        onClick={handleDeleteCancel}
                        sx={{
                            textTransform: "none",
                            color: "#2F86FF",
                            fontWeight: 600,
                            "&:hover": { backgroundColor: "rgba(47, 134, 255, 0.1)" },
                        }}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleDeleteConfirm}
                        sx={{
                            textTransform: "none",
                            fontWeight: 500,
                            backgroundColor: "#d32f2f",
                            color: "#fff",
                            padding: "6px 16px",
                            borderRadius: "4px",
                            "&:hover": {
                                backgroundColor: "#b71c1c",
                            },
                        }}
                    >
                        Yes, Delete
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};