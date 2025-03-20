package utils

import (
	"bytes"
	"io"

	"github.com/gin-gonic/gin"
)

func ReadFileContent(file io.Reader) ([]byte, error) {
	buf := new(bytes.Buffer)
	if _, err := io.Copy(buf, file); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

// Return the form file bytes
func GetFormFileBytes(fileName string, ctx *gin.Context) ([]byte, error) {
	fh, err := ctx.FormFile(fileName)
	if err != nil {
		return nil, err
	}
	f, err := fh.Open()
	if err != nil {
		return nil, err
	}
	defer f.Close()
	Content, err := io.ReadAll(f)
	if err != nil {
		return nil, err
	}
	return Content, nil

}
