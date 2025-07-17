package wecs_test

import (
	"testing"
	"github.com/kubestellar/ui/backend/wecs"
	"github.com/stretchr/testify/assert"
)

func TestResourceDataStruct(t *testing.T) {
	r := wecs.ResourceData{
		Name: "test",
		Kind: "Pod",
		Raw: []byte(`{"foo":"bar"}`),
		ReplicaSets: nil,
		Pods: nil,
	}
	assert.Equal(t, "test", r.Name)
	assert.Equal(t, "Pod", r.Kind)
	assert.Contains(t, string(r.Raw), "foo")
}

func TestClusterDataStruct(t *testing.T) {
	c := wecs.ClusterData{
		Name: "cluster1",
		Namespaces: nil,
	}
	assert.Equal(t, "cluster1", c.Name)
}
