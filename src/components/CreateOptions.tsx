import { useState } from "react";
import Editor from "@monaco-editor/react";

interface Props {
  activeOption: string | null;
  setActiveOption: (option: string) => void;
  setHasUnsavedChanges: (value: boolean) => void;
  onCancel: () => void;
}

const CreateOptions = ({
  activeOption,
  setActiveOption,
  setHasUnsavedChanges,
  onCancel,
}: Props) => {
  const [fileType, setFileType] = useState<"yaml" | "json">("yaml");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [editorContent, setEditorContent] = useState<string>("");


  const [formData, setFormData] = useState({
    appName: "",
    containerImage: "",
    numberOfPods: 1,
    service: "None",
    description: "",
    namespace: "",
    cpuRequirement: "",
    memoryRequirement: "",
    runCommand: "",
    runCommandArgs: "",
    key: "",
    value: "",
    imagePullRequest: ""
  });


  // using option2 two sending to backend 
  const handleFileUpload = async () => {
    if (!selectedFile) {
        console.error("No file selected.");
        return;
    }

    const formData = new FormData();
    formData.append("wds", selectedFile);

    console.log("📤 Sending FormData:", formData.get("wds"));

    try {
        const response = await fetch("http://localhost:4000/api/wds/create", {
            method: "POST",
            body: formData, 
        });

        const data = await response.json();
        console.log("✅ Upload Response:", data);

        if (response.ok) { 
            alert("Deploy Successfully");

            // ✅ Refresh page after successful deployment
            window.location.reload(); 
        } else {
            alert(`Deployment failed: ${data.message || "Unknown error"}`);
        }

    } catch (error) {
        console.error("❌ Upload Error:", error);
        alert("Upload failed.");
    }

    setSelectedFile(null);
    setActiveOption("null");
  }

  // using option1 two sending to backend 
  // const handleRawUpload = async () => {
  //   const fileContent = editorContent.trim();
  //   if (!fileContent) {
  //     alert("Please enter YAML or JSON content.");
  //     return;
  //   }
  
  //   if (fileType === "json") {
  //     try {
  //       JSON.parse(fileContent); 
  //     } catch (error) {
  //       alert("Invalid JSON format.");
  //       return;
  //     }
  //   }
  
  //   try {
  //     const response = await fetch("http://localhost:4000/api/wds/create", {
  //       method: "POST",
  //       headers: {
  //         "Content-Type": fileType === "json" ? "application/json" : "application/x-yaml",
  //       },
  //       body: JSON.stringify({
  //         content: fileContent,
  //         namespace: formData.namespace, // Pass namespace here
  //       }),
  //     });
  
  //     if (!response.ok) {
  //       const errorText = await response.text();
  //       throw new Error(`Upload failed: ${errorText}`);
  //     }
  
  //     alert("Upload successful!");
  //   } catch (error) {
  //     console.error("Error uploading YAML/JSON:", error);
  //     alert("Upload failed.");
  //   }
  // };
  

  const handleCancel = () => {
    setSelectedFile(null);
    onCancel();
  };

  return (
    <div className="bg-gray-900 rounded-lg p-6">
      <div className="flex space-x-4 border-b border-gray-700 mb-6">
        {["option1", "option2", "option3"].map((option) => (
          <button
            key={option}
            className={`p-4 text-white bg-gray-900 ${
              activeOption === option
                ? "border-b-2 border-blue-500"
                : "border border-transparent"
            }`}
            
            onClick={() => {
              console.log("Clicked:", option)
              setActiveOption(option)}
            }
              >
            {option === "option1" && "Create from Input"}
            {option === "option2" && "Create from File"}
            {option === "option3" && "Create from Form"}
          </button>
        ))}
      </div>

      {activeOption === "option1" && (
        <div className="bg-gray-900 p-6">
          <p className="text-white font-medium mt-2">
            Select a YAML or JSON file specifying the resources to deploy to the currently selected namespace.
            <span className="text-blue-500 cursor-pointer"> Learn more</span>
          </p>

          <div className="mt-6">
            <label className="text-white font-medium block mb-2">Select File Type</label>
            <select
              className="w-full p-2 rounded-md bg-gray-700 text-white"
              value={fileType}
              onChange={(e) => setFileType(e.target.value as 'yaml' | 'json')}
            >
              <option className="text-white bg-gray-700" value="yaml">YAML</option>
              <option className="text-white bg-gray-700" value="json">JSON</option>
            </select>
          </div>
              {/* value={fileType === 'yaml' ? '# Enter your YAML here' : '{\n  \n}'} */}

          <div className="mt-6">
            <Editor
              height="350px"
              language={fileType}
              value={editorContent} // Use state value
              options={{ fontSize: 14, lineNumbers: "on", automaticLayout: true, minimap: { enabled: false } }}
              theme="vs-dark"
              className="rounded-md"
              onChange={(value) => {
                setEditorContent(value || ""); // Save editor content
                setHasUnsavedChanges(true);
              }}
            />
          </div>

          <div className="flex gap-6 mt-8">
            <button 
            className="h-10 px-4 bg-gray-600 text-gray-400 hover:text-gray-100 hover:bg-green-600 rounded"
            // onClick={handleRawUpload} // Call the function
          >
            Upload
          </button>

            <button className="h-10 px-4 text-blue-400 bg-gray-900 rounded" onClick={handleCancel}>
              Cancel
            </button>
          </div>
        </div>
      )}
      
      {activeOption === "option2" && (
        <div className="bg-gray-900 p-4">
          <p className="text-white font-medium">
            Select a YAML or JSON file specifying the resources to deploy to the currently selected namespace.
            <span className="text-blue-500 cursor-pointer"> Learn more</span>
          </p>

          {/* Label & File Name Display */}
          <label htmlFor="file-upload" className="block w-full text-white cursor-pointer mt-7 py-2 border-b border-white">
            {selectedFile ? `Selected File: ${selectedFile.name}` : "Choose YAML or JSON file"}
          </label>

          {/* Hidden File Input */}
          <input
            id="file-upload"
            type="file"
            accept=".yaml,.yml,.json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0] || null;
              console.log("File selected:", file);
              setSelectedFile(file);
              setHasUnsavedChanges(true);
            }}
          />

          {/* Buttons Section */}
          <div className="flex gap-4 mt-6">
            <button className="h-10 px-4 hover:text-gray-100 hover:bg-green-600 bg-gray-600 text-gray-400 rounded" onClick={handleFileUpload}>
              Upload & Deploy
            </button>
            <button className="h-10 px-4 text-blue-400 rounded" onClick={handleCancel}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {activeOption === "option3" && (
        <div className="bg-gray-900 p-6 rounded-md">
          <form>
            <div className="mb-4 flex justify-between gap-8">
              <div>
              <label className="block text-white">App Name</label>
              <input
                type="text"
                className="w-192 p-3 bg-transparent text-white border-b border-gray-400 focus:outline-none"
                value={formData.appName}
                onChange={(e) => {
                  setFormData({ ...formData, appName: e.target.value });
                  setHasUnsavedChanges(true);
                }}
              />
            </div>
            <p className="text-gray-400">An app label with this value will be added to the Deployment and Service that get deployee. <span className="text-blue-600">Learn more.</span></p>
            </div>
            <div className="mb-4 flex justify-between gap-8">
              <div>
              <label className="block text-white">Container Image</label>
              <input
                type="text"
                className="w-192 p-3 bg-transparent text-white border-b border-gray-400 focus:outline-none"
                value={formData.containerImage}
                onChange={(e) => {
                  setFormData({ ...formData, containerImage: e.target.value });
                  setHasUnsavedChanges(true);
                }}
              />
            </div>
            <p className="text-gray-400">Enter the URL of a public image on any registry, or private image hosted on Docker Hub or Google Container Registry. <span className="text-blue-600">Learn more.</span></p>
            </div>
            <div className="mb-4 flex justify-between gap-8">
              <div>
              <label className="block text-white">Number of Pods</label>
              <input
                type="number"
                className="w-192 p-3 bg-transparent text-white border-b border-gray-400 focus:outline-none"
                value={formData.numberOfPods}
                onChange={(e) => {
                  setFormData({ ...formData, numberOfPods: +e.target.value });
                  setHasUnsavedChanges(true);
                }}
              />
            </div>
            <p className="text-gray-400">A Deployment will be created to maintain the desired number of pods across your cluster. <span className="text-blue-600">Learn more.</span></p>
            </div>
            <div className="mb-4 flex justify-between gap-8">
              <div>
              <label className="block text-white">Service Type</label>
              <select
                className="w-192 p-3 bg-gray-900 text-white border-b border-gray-400 focus:outline-none appearance-none"
                value={formData.service}
                onChange={(e) => {
                  setFormData({ ...formData, service: e.target.value });
                  setHasUnsavedChanges(true);
                }}
              >
                <option className="bg-gray-900 text-white" value="None">None</option>
                <option className="bg-gray-900 text-white" value="ClusterIP">ClusterIP</option>
                <option className="bg-gray-900 text-white" value="NodePort">NodePort</option>
                <option className="bg-gray-900 text-white" value="LoadBalancer">LoadBalancer</option>
              </select>
              </div>
              <p className="text-gray-400">Optionally, an internal or external Service can be defined to  map an incoming Port to target Port seen by the container. <span className="text-blue-600">Learn more.</span></p>
              </div>
            <div className="mb-4 flex justify-between gap-8">
              <div>
              <label className="block text-white">Namespace</label>
              <input
                type="text"
                className="w-192 p-3 bg-transparent text-white border-b border-gray-400 focus:outline-none"
                value={formData.namespace}
                onChange={(e) => {
                  setFormData({ ...formData, namespace: e.target.value });
                  setHasUnsavedChanges(true);
                }}
              />
            </div>
            <p className="text-gray-400">Namescpaes let you partition resources into logically named groups. <span className="text-blue-600">Learn more.</span></p>
            </div>

            {showAdvancedOptions && (
              <>
                <div className="flex justify-between gap-8">
                <div className="mb-6">
                  <label className="block text-white">Description</label>
                  <input
                    type="text"
                    className="w-192 p-3 bg-transparent text-white border-b border-gray-400 focus:outline-none"
                    value={formData.description}
                    onChange={(e) => {
                      setFormData({ ...formData, description: e.target.value });
                      setHasUnsavedChanges(true);
                    }}
                  />
                </div>
                <p className="text-gray-400">The description will be added as an annotation to the Deployment and displyed in the application's details.</p>
                </div>

                <div className="flex justify-between gap-8">
                  <div>
                <label className="block text-white mb-6">Labels</label>
                <div className="flex justify gap-8 mb-12">
                   <input
                   type="text"
                   className="w-80 bg-transparent text-white border-b border-gray-400 focus:outline-none " placeholder="Key"
                   // value={formData.labels}
                   // onChange={(e) => setFormData({ ...formData, labels: e.target.value })}
                 />
                 <input
                   type="text"
                   className="w-80 bg-transparent text-white border-b border-gray-400 focus:outline-none" placeholder="Value"
                   // value={formData.labels}
                   // onChange={(e) => setFormData({ ...formData, labels: e.target.value })}
                 />
                  
                </div>
                <div className="flex justify gap-8 mb-12">
                  <input
                    type="text"
                    className="w-80 bg-transparent text-white border-b border-gray-400 focus:outline-none " placeholder="Key"
                    // value={formData.labels}
                    // onChange={(e) => setFormData({ ...formData, labels: e.target.value })}
                  />
                  <input
                    type="text"
                    className="w-80 bg-transparent text-white border-b border-gray-400 focus:outline-none" placeholder="Value"
                    // value={formData.labels}
                    // onChange={(e) => setFormData({ ...formData, labels: e.target.value })}
                  />
                  
                  </div>
                </div>
                <p className="text-gray-400">The specified labels will be applied to the created Deployment,Service and Pods. <span className="text-blue-600">Learn more.</span></p>
                </div>

                <div className="flex justify-between gap-8">
                <div className="mb-12">
                  {/* <label className="block text-white">Image Pull Request</label> */}
                  <input
                    type="text"
                    className="w-192 bg-transparent text-white border-b border-gray-300 focus:outline-none" placeholder="Image Pull Request"
                    value={formData.imagePullRequest}
                    onChange={(e) => setFormData({ ...formData, imagePullRequest: e.target.value })}
                  />
                  </div>
                  <p className="text-gray-400">The specified colud require a pull secret credential if it is private. <span className="text-blue-600">Learn more.</span></p>
                </div>
                <div className="flex justify-between gap-8">
                <div className="flex justify gap-8 mb-12">
                  <input
                    type="text"
                    className="w-80 bg-transparent text-white border-b border-gray-400 focus:outline-none" placeholder="CPU Requirement"
                    value={formData.cpuRequirement}
                    onChange={(e) => setFormData({ ...formData, cpuRequirement: e.target.value })}
                  />
                  <input
                    type="text"
                    className="w-80 bg-transparent text-white border-b border-gray-400 focus:outline-none" placeholder="Memory Requirement"
                    value={formData.memoryRequirement}
                    onChange={(e) => setFormData({ ...formData, memoryRequirement: e.target.value })}
                  />
                </div>
                <p className="text-gray-400">You can specify minimum CPU and memory requirements for the container. <span className="text-blue-600">Learn more.</span></p>
                </div>
                <div className="flex justify-between gap-8">
                <div className="mb-12">
                  {/* <label className="block text-white">Run Command</label> */}
                  <input
                    type="text"
                    className="w-192 bg-transparent text-white border-b border-gray-400 focus:outline-none" placeholder="Run Command"
                    value={formData.runCommand}
                    onChange={(e) => setFormData({ ...formData, runCommand: e.target.value })}
                  />
                </div>
                <p className="text-gray-400">By default, your containers run the selected image's default entrypoint command. <span className="text-blue-600">Learn more.</span></p>
                </div>
                <div className="mb-12">
                  {/* <label className="block text-white">Run Command Arguments</label> */}
                  <input
                    type="text"
                    className="w-192 bg-transparent text-white border-b border-gray-400 focus:outline-none" placeholder="Run Command Arguments"
                    value={formData.runCommandArgs}
                    onChange={(e) => setFormData({ ...formData, runCommandArgs: e.target.value })}
                  />
                </div>
                <div className="flex justify gap-24" >
                <div>
                <label className="block text-white mb-6">Environment Variables</label>
                <div className="flex justify gap-8">
                  <input
                    type="text"
                    className="w-72 bg-transparent text-white border-b border-gray-400 focus:outline-none " placeholder="Name"
                    // value={formData.labels}
                    // onChange={(e) => setFormData({ ...formData, labels: e.target.value })}
                  />
                  <input
                    type="text"
                    className="w-72 bg-transparent text-white border-b border-gray-400 focus:outline-none" placeholder="Value"
                    // value={formData.labels}
                    // onChange={(e) => setFormData({ ...formData, labels: e.target.value })}
                  />
                </div>
                </div>
                <p className="text-gray-400">Eviornment variables available for  use the container. <span className="text-blue-600">Learn more.</span></p>
                </div>
              </>
            )}
            <div className="flex gap-4 mt-8">
              <button type="button" className="h-12 px-5 hover:text-gray-100 hover:bg-green-600 bg-gray-600 text-gray-400 rounded">
                Deploy
              </button>
              <button type="button" className="h-12 px-5 text-blue-400 rounded">
                Preview
              </button>
              <button type="button" className="h-12 px-5 text-blue-400 rounded" onClick={onCancel}>
                Cancel
              </button>
              <button
                type="button"
                className="text-blue-400"
                onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
              >
                {showAdvancedOptions ? "Hide Advanced Options" : "Show Advanced Options"}
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};

export default CreateOptions;