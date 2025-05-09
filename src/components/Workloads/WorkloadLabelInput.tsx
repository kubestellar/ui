import { InputAdornment, TextField } from '@mui/material'
import React from 'react'

interface Props {
    value: string
    handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void
    isError?: boolean
    theme: string
}

const WorkloadLabelInput = ({ value, handleChange, isError, theme }: Props) => {
    const prefix = "kubestellar.io/workload:"
    
    return (
        <TextField
            fullWidth
            label="Workload Label *"
            value={value}
            onChange={handleChange}
            sx={{
                width: "100%",
                margin: "0 auto 10px auto",
                input: { color: theme === "dark" ? "#d4d4d4" : "#333" },
                label: { color: theme === "dark" ? "#858585" : "#666" },
                "& .MuiOutlinedInput-root": {
                    "& fieldset": {
                        borderColor: theme === "dark" ? "#444" : "#e0e0e0",
                    },
                    "&:hover fieldset": {
                        borderColor: "#1976d2",
                    },
                    "&.Mui-focused fieldset": {
                        borderColor: "#1976d2",
                    },
                    "&.Mui-error fieldset": {
                        borderColor: "#d32f2f",
                    },
                },
                "& .MuiInputLabel-root.Mui-focused": {
                    color: "#1976d2",
                },
                "& .MuiInputLabel-root.Mui-error": {
                    color: "#d32f2f",
                },
                "& .MuiFormHelperText-root": {
                    color: theme === "dark" ? "#858585" : "#666",
                },
            }}
            helperText={isError?"Label not found":"Workload label is key:value pair. Key is constant and defaulted to 'kubestellar.io/workload', you can only change the value."}
            error={isError}
            slotProps={{
                input: {
                    startAdornment: !isError && (
                        <InputAdornment position="start">
                            <span style={{ color: theme==="dark"?"white":"black" }}>{prefix}</span>
                        </InputAdornment>
                    ),
                },
            }}
        />
    )
}

export default WorkloadLabelInput