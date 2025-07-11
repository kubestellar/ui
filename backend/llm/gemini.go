package main

import (
    "bytes"
    "encoding/json"
    "net/http"
)

type GeminiRequest struct {
    Contents []struct {
        Role  string `json:"role"`
        Parts []struct {
            Text string `json:"text"`
        } `json:"parts"`
    } `json:"contents"`
}


func AskGemini(context string, question string) (string, error) {
    apiKey := "AIzaSyDCzCBTVeFXNN4TS4ZCyyIITorgn0z0nig"
    url := "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" + apiKey

    systemPrompt := `You are a helpful AI assistant embedded in the Kubestellar UI.
Your job is to answer user questions, resolve their issues, and guide them through using or troubleshooting features.`

    fullPrompt := systemPrompt + "\n\n" + "Context:\n" + context + "\n\nQuestion:\n" + question

    body := map[string]interface{}{
        "contents": []map[string]interface{}{
            {
                "role": "user",
                "parts": []map[string]string{
                    {"text": fullPrompt},
                },
            },
        },
    }

    jsonBody, _ := json.Marshal(body)
    resp, err := http.Post(url, "application/json", bytes.NewBuffer(jsonBody))
    if err != nil {
        return "", err
    }
    defer resp.Body.Close()

    var result map[string]interface{}
    json.NewDecoder(resp.Body).Decode(&result)

    if c, ok := result["candidates"].([]interface{}); ok && len(c) > 0 {
        content := c[0].(map[string]interface{})["content"]
        parts := content.(map[string]interface{})["parts"].([]interface{})
        return parts[0].(map[string]interface{})["text"].(string), nil
    }

    return "No answer", nil
}
