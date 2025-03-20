package deployment

/*
----- This are the things are present in this file -----
* CreateDeployment - create deployment
* UpdateDeployment - update deployment
* DeleteDeployment - delete deployment
* uploadFile - helps you for uploading the yaml file
*/

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	FetchYaml "github.com/kubestellar/ui/github"
	"github.com/kubestellar/ui/wds"
	"gopkg.in/yaml.v2"
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/util/retry"
)

func int32Ptr(i int32) *int32 { return &i }

func homeDir() string {
	if h := os.Getenv("HOME"); h != "" {
		return h
	}
	return os.Getenv("USERPROFILE") // windows
}

type Deployment struct {
	APIVersion string `yaml:"apiVersion"`
	Kind       string `yaml:"kind"`
	Metadata   struct {
		Name   string            `yaml:"name"`
		Labels map[string]string `yaml:"labels"`
	} `yaml:"metadata"`
	Spec struct {
		Replicas int `yaml:"replicas"`
		Selector struct {
			MatchLabels map[string]string `yaml:"matchLabels"`
		} `yaml:"selector"`
		Template struct {
			Metadata struct {
				Labels map[string]string `yaml:"labels"`
			} `yaml:"metadata"`
			Spec struct {
				Containers []struct {
					Name  string `yaml:"name"`
					Image string `yaml:"image"`
					Ports []struct {
						ContainerPort int `yaml:"containerPort"`
					} `yaml:"ports"`
				} `yaml:"containers"`
			} `yaml:"spec"`
		} `yaml:"template"`
	} `yaml:"spec"`
}

/*
CreateDeployment: Create deployment through the local deployment yaml file and also support with some limitation for the remote github url
*/
func CreateDeployment(ctx *gin.Context) {
	// this only need when you think i will mention github repo
	type parameters struct {
		Url  string `json:"url"`
		Path string `json:"path"`
	}
	params := parameters{}
	if _, _, err := ctx.Request.FormFile("wds"); err != nil {
		if err := ctx.ShouldBindJSON(&params); err != nil {
			ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
	}

	clientset, err := wds.GetClientSetKubeConfig()
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{
			"message": "failed to create Kubernetes clientset",
			"err":     err,
		})
		return
	}
	var dat *Deployment
	// upload the yaml configuration file and read their value
	if params.Url != "" {
		if !(len(params.Path) > 0 && len(params.Url) > 0 && strings.Contains(params.Url, "github")) {
			ctx.JSON(http.StatusBadRequest, gin.H{
				"message": "both path and github repo url are required",
			})
			return
		}
		content, err := FetchYaml.FetchYamlFile(ctx, params.Url, params.Path)
		if err != nil {
			ctx.JSON(http.StatusBadRequest, gin.H{
				"message": "failed to fetch the yaml file from github url",
				"err":     err,
			})
			return
		}
		dat = (*Deployment)(content)
	} else {
		dat, err = uploadFile(ctx)
		if err != nil {
			ctx.JSON(http.StatusBadRequest, gin.H{
				"message": "failed to upload",
				"err":     err,
			})
			return
		}
	}

	replica := dat.Spec.Replicas
	if replica == 0 {
		replica = 1
	}

	if len(dat.Spec.Template.Spec.Containers) == 0 {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "No container specified in deployment YAML"})
		return
	}
	// create the deployment object
	deployment := &appsv1.Deployment{
		ObjectMeta: metav1.ObjectMeta{
			Name:      dat.Metadata.Name,
			Namespace: "default", // currently i am going with the default namespace
		},
		Spec: appsv1.DeploymentSpec{
			Replicas: int32Ptr(int32(replica)),
			Selector: &metav1.LabelSelector{
				MatchLabels: map[string]string{
					"app": dat.Spec.Selector.MatchLabels["app"],
				},
			},
			Template: corev1.PodTemplateSpec{
				ObjectMeta: metav1.ObjectMeta{
					Labels: map[string]string{
						"app": dat.Spec.Template.Metadata.Labels["app"],
					},
				},
				Spec: corev1.PodSpec{
					Containers: []corev1.Container{
						{
							Name:  dat.Spec.Template.Spec.Containers[0].Name,
							Image: dat.Spec.Template.Spec.Containers[0].Image,
							Ports: []corev1.ContainerPort{
								{
									ContainerPort: 80,
								},
							},
						},
					},
				},
			},
		},
	}
	// create the deployment
	retryErr := retry.RetryOnConflict(retry.DefaultRetry, func() error {
		_, err := clientset.AppsV1().Deployments("default").Create(context.TODO(), deployment, metav1.CreateOptions{})
		return err
	})
	if retryErr != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{
			"message": "failed to create deployment",
			"err":     retryErr,
		})
		return
	}
	fmt.Println("Deployment created successfully!")
	ctx.JSON(http.StatusAccepted, gin.H{
		"message":    "Deployment created successfully!",
		"deployment": deployment,
	})
}

// user raw data - for editor
func HandleCreateDeploymentJson(ctx *gin.Context) {
	type ContainerPort struct {
		ContainerPort int32 `json:"containerPort"`
	}
	type Container struct {
		Name  string          `json:"name"`
		Image string          `json:"image"`
		Ports []ContainerPort `json:"ports"`
	}

	type Parameters struct {
		Namespace string            `json:"namespace"`
		Name      string            `json:"name"`
		Replicas  int32             `json:"replicas"`
		Labels    map[string]string `json:"labels"`
		Container Container         `json:"container"`
	}
	params := Parameters{}
	if err := ctx.ShouldBindJSON(&params); err != nil {
		fmt.Println("hello1")
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	clientset, err := wds.GetClientSetKubeConfig()
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{
			"message": "failed to create Kubernetes clientset",
			"err":     err,
		})
		return
	}

	deployment := &appsv1.Deployment{
		ObjectMeta: metav1.ObjectMeta{
			Name:      params.Name,
			Namespace: params.Namespace,
		},
		Spec: appsv1.DeploymentSpec{
			Replicas: int32Ptr(params.Replicas),
			Selector: &metav1.LabelSelector{
				MatchLabels: params.Labels,
			},
			Template: corev1.PodTemplateSpec{
				ObjectMeta: metav1.ObjectMeta{
					Labels: params.Labels,
				},
				Spec: corev1.PodSpec{
					Containers: []corev1.Container{
						{
							Name:  params.Container.Name,
							Image: params.Container.Image,
							Ports: []corev1.ContainerPort{
								{
									ContainerPort: params.Container.Ports[0].ContainerPort,
								},
							},
						},
					},
				},
			},
		},
	}
	_, err = clientset.AppsV1().Deployments(params.Namespace).Create(context.TODO(), deployment, metav1.CreateOptions{})
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{
			"message": "failed to create deployment",
			"error":   err.Error(),
		})
		return
	}

	ctx.JSON(http.StatusCreated, gin.H{
		"message":    "Deployment created successfully!",
		"deployment": deployment,
	})
}

/*
UpdateDeployment: This function is about updating the deployment
*/
func UpdateDeployment(ctx *gin.Context) {
	type parameters struct {
		Namespace string `json:"namespace"`
		Name      string `json:"name"`
		Image     string `json:"image"`
		Replicas  int32  `json:"replicas"`
	}
	params := parameters{}
	if err := ctx.ShouldBindJSON(&params); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if params.Name == "" {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Enter the name of the deployment"})
		return
	}

	clientset, err := wds.GetClientSetKubeConfig()
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{
			"message": "Failed to create Kubernetes clientset",
			"error":   err.Error(),
		})
		return
	}

	// Set default namespace if none provided
	if params.Namespace == "" {
		params.Namespace = "default"
	}

	// Get the deployment object
	deployment, err := clientset.AppsV1().Deployments(params.Namespace).Get(context.TODO(), params.Name, metav1.GetOptions{})
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{
			"message": "Failed to get deployment",
			"error":   err.Error(),
		})
		return
	}

	// Ensure the container list is not empty before updating
	if len(deployment.Spec.Template.Spec.Containers) > 0 {
		if params.Image != "" {
			deployment.Spec.Template.Spec.Containers[0].Image = params.Image
		}
	} else {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "No containers found in deployment"})
		return
	}

	if params.Replicas != 0 {
		deployment.Spec.Replicas = int32Ptr(params.Replicas)
	}

	retryErr := retry.RetryOnConflict(retry.DefaultRetry, func() error {
		_, updateErr := clientset.AppsV1().Deployments(params.Namespace).Update(context.TODO(), deployment, metav1.UpdateOptions{})
		return updateErr
	})
	if retryErr != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{
			"message": "Failed to update deployment",
			"error":   retryErr.Error(),
		})
		return
	}

	ctx.JSON(http.StatusAccepted, gin.H{
		"message": "Successfully updated the deployment!",
		"name":    params.Name,
	})
}

func DeleteDeployment(ctx *gin.Context) {
	type parameters struct {
		Namespace string `json:"namespace"`
		Name      string `json:"name"`
	}
	params := parameters{}
	if err := ctx.ShouldBindJSON(&params); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if params.Namespace == "" {
		params.Namespace = "default"
	}
	clientset, err := wds.GetClientSetKubeConfig()
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{
			"message": "failed to create Kubernetes clientset",
			"err":     err,
		})
		return
	}
	deletePolicy := metav1.DeletePropagationForeground
	// taking name and namespace from user
	err = clientset.AppsV1().Deployments(params.Namespace).Delete(context.TODO(), params.Name, metav1.DeleteOptions{
		PropagationPolicy: &deletePolicy,
	})
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{
			"message": "failed to delete deployment",
			"error":   err.Error(),
		})
		return
	}
	ctx.JSON(http.StatusAccepted, gin.H{
		"name":    params.Name,
		"message": "Successfully deleted deployment",
	})
}

type DeploymentStatus struct {
	Name              string `json:"name"`
	Namespace         string `json:"namespace"`
	Replicas          int32  `json:"replicas"`
	AvailableReplicas int32  `json:"available_replicas"`
}

func logDeployments(deployments interface{}) {
	data, err := json.MarshalIndent(map[string]interface{}{
		"deployment": deployments,
	}, "", "  ") // Indentation of 2 spaces
	if err != nil {
		log.Printf("Error marshalling deployments: %v", err)
		return
	}

	log.Println(string(data))
}

/*
This function helps to create the deployment
*/
func uploadFile(ctx *gin.Context) (*Deployment, error) {
	file, header, err := ctx.Request.FormFile("wds")
	if err != nil {
		return nil, err
	}

	fileExt := filepath.Ext(header.Filename)
	if fileExt != ".yaml" {
		return nil, fmt.Errorf("file extension must be .yaml")
	}
	originalFileName := strings.TrimSuffix(filepath.Base(header.Filename), filepath.Ext(header.Filename))
	now := time.Now()
	filename := strings.ReplaceAll(strings.ToLower(originalFileName), " ", "-") + "-" + fmt.Sprintf("%v", now.Unix()) + fileExt
	log.Print(filename)
	tempDir := "/tmp"
	// upload  it
	out, err := os.Create(filepath.Join(tempDir, filename))
	if err != nil {
		log.Fatal(err)
	}
	defer out.Close()
	_, err = io.Copy(out, file)
	if err != nil {
		log.Fatal(err)
	}
	// read the yaml file
	yamlData, err := os.ReadFile(filepath.Join(tempDir, filename))
	if err != nil {
		return nil, fmt.Errorf("failed to read file: %v", err)
	}

	var deployment Deployment
	if err := yaml.Unmarshal(yamlData, &deployment); err != nil {
		return nil, fmt.Errorf("failed to parse YAML: %v", err)
	}
	return &deployment, nil
}
