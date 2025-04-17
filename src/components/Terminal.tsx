import PodTerminal from "./PodTerminal"
const Terminal = () => {
// ws://localhost:4000/ws/pod/test-fhn30/test-fhn30-66cf98cc85-fbjnv/shell/my-container?context=cluster2
// Create your own and put the value here (just for testing I did)
// In Progress
    return (
        <>
            <PodTerminal
                namespace="test2-rahul"
                pod="test2-rahul-66cf98cc85-q48dh"
                container="my-container"
                context="cluster2"
            />

        </>
    );
};

export default Terminal;