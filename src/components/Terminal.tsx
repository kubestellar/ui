import PodTerminal from "./PodTerminal"
const Terminal = () => {
// ws://localhost:4000/ws/pod/test-fhn30/test-fhn30-66cf98cc85-fbjnv/shell/my-container?context=cluster2
    return (
        <>
            <PodTerminal
                namespace="test-fhn30"
                pod="test-fhn30-66cf98cc85-fbjnv"
                container="my-container"
                context="cluster2"
            />

        </>
    );
};

export default Terminal;