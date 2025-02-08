// import { useState } from "react";
// import Editor from "@monaco-editor/react";

// interface Props {
//   activeOption: string | null;
//   setActiveOption: (option: string) => void;
//   setHasUnsavedChanges: (value: boolean) => void;
//   onCancel: () => void;
// }

// const CreateOptions = ({
//   activeOption,
//   setActiveOption,
//   setHasUnsavedChanges,
//   onCancel,
// }: Props) => {
//   const [yamlContent, setYamlContent] = useState("");
//   const [fileType, setFileType] = useState<"yaml" | "json">("yaml");
//   const [selectedFile, setSelectedFile] = useState<File | null>(null);
//   const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

//   const [formData, setFormData] = useState({
//     appName: "",
//     containerImage: "",
//     numberOfPods: 1,
//     service: "None",
//     namespace: "",
//     cpuRequirement: "",
//     memoryRequirement: "",
//     runCommand: "",
//     runCommandArgs: "",
//     key: "",
//     value: "",
//   });

//   const handleFileUpload = () => {
//     if (!selectedFile) {
//       alert("Please select a file first.");
//       return;
//     }
//     alert(`Uploading file: ${selectedFile.name}`);
//   };

//   const handleCancel = () => {
//     setSelectedFile(null);
//     onCancel();
//   };

//   return (
//     <div className="bg-gray-900 rounded-lg p-6">
//       <div className="flex space-x-4 border-b border-gray-700 mb-6">
//         {["option1", "option2", "option3"].map((option) => (
//           <button
//             key={option}
//             className={`p-4 text-white ${
//               activeOption === option
//                 ? "border-b-4 border-blue-500"
//                 : "border-b-4 border-transparent"
//             }`}
//             onClick={() => setActiveOption(option)}
//           >
//             {option === "option1" && "Create from Input"}
//             {option === "option2" && "Create from File"}
//             {option === "option3" && "Create from Form"}
//           </button>
//         ))}
//       </div>



//       {activeOption === "option1" && (
//       <div className="bg-gray-900 p-6">
//         <p className="text-white font-medium mt-2">
//           Select a YAML or JSON file specifying the resources to deploy to the currently selected namespace.
//           <span className="text-blue-500 cursor-pointer"> Learn more</span>
//         </p>

//         <div className="mt-6">
//           <label className="text-white font-medium block mb-2">Select File Type</label>
//           <select
//             className="w-full p-2 rounded-md bg-gray-700 text-white"
//             value={fileType}
//             onChange={(e) => setFileType(e.target.value as 'yaml' | 'json')}
//           >
//             <option className="text-white bg-gray-700" value="yaml">YAML</option>
//             <option className="text-white bg-gray-700" value="json">JSON</option>
//           </select>
//         </div>

//         <div className="mt-6">
//           <Editor
//             height="350px"
//             language={fileType}
//             value={fileType === 'yaml' ? '# Enter your YAML here' : '{\n  \n}'}
//             onChange={(value) => setYamlContent(value || '')}
//             options={{ fontSize: 14, lineNumbers: "on", automaticLayout: true, minimap: { enabled: false } }}
//             theme="vs-dark"
//             className="rounded-md"
//           />
//         </div>

//         <div className="flex gap-6 mt-8">
//           <button className="h-10 px-4 bg-gray-600 text-gray-400 rounded" onClick={handleFileUpload}>
//             Upload
//           </button>
//           <button className="h-10 px-4 text-blue-400 bg-gray-900 rounded" onClick={handleCancel}>
//             Cancel
//           </button>
//         </div>
//       </div>
//     )}

      // {activeOption === "option2" && (
      //   <div className="bg-gray-900 p-4">
      //     <p className="text-white font-medium">
      //       Select a YAML or JSON file specifying the resources to deploy to the currently selected namespace.
      //       <span className="text-blue-500 cursor-pointer"> Learn more</span>
      //     </p>

      //     {/* Label for File Upload */}
      //     <label htmlFor="file-upload" className="block w-full text-white cursor-pointer mt-7 py-2 border-b border-white">
      //       Choose YAML or JSON file
      //     </label>

      //     {/* Hidden File Input */}
      //     <input
      //       id="file-upload"
      //       type="file"
      //       accept=".yaml,.yml,.json"
      //       className="hidden"
      //       onChange={(e) => {
      //         setSelectedFile(e.target.files?.[0] || null);
      //         setHasUnsavedChanges(true);
      //       }}
      //     />

      //     {/* Buttons Section */}
      //     <div className="flex gap-4 mt-6">
      //       <button className="h-10 px-4 bg-gray-600 text-gray-400 rounded" onClick={handleFileUpload}>
      //         Upload
      //       </button>
      //       <button className="h-10 px-4 text-blue-400 rounded" onClick={handleCancel}>
      //         Cancel
      //       </button>
      //     </div>
      //   </div>
      // )}

      // {activeOption === "option3" && (
      //   <div className="bg-gray-900 p-6 rounded-md">
      //     <form>
      //       <div className="mb-4">
      //         <label className="block text-white">App Name</label>
      //         <input
      //           type="text"
      //           className="w-full p-3 bg-transparent text-white border-b border-gray-400 focus:outline-none"
      //           value={formData.appName}
      //           onChange={(e) => {
      //             setFormData({ ...formData, appName: e.target.value });
      //             setHasUnsavedChanges(true);
      //           }}
      //         />
      //       </div>
      //       <div className="mb-4">
      //         <label className="block text-white">Container Image</label>
      //         <input
      //           type="text"
      //           className="w-full p-3 bg-transparent text-white border-b border-gray-400 focus:outline-none"
      //           value={formData.containerImage}
      //           onChange={(e) => {
      //             setFormData({ ...formData, containerImage: e.target.value });
      //             setHasUnsavedChanges(true);
      //           }}
      //         />
      //       </div>
      //       <div className="mb-4">
      //         <label className="block text-white">Number of Pods</label>
      //         <input
      //           type="number"
      //           className="w-full p-3 bg-transparent text-white border-b border-gray-400 focus:outline-none"
      //           value={formData.numberOfPods}
      //           onChange={(e) => {
      //             setFormData({ ...formData, numberOfPods: +e.target.value });
      //             setHasUnsavedChanges(true);
      //           }}
      //         />
      //       </div>
      //       <div className="mb-4">
      //         <label className="block text-white">Service Type</label>
      //         <select
      //           className="w-full p-3 bg-gray-900 text-white border-b border-gray-400 focus:outline-none appearance-none"
      //           value={formData.service}
      //           onChange={(e) => {
      //             setFormData({ ...formData, service: e.target.value });
      //             setHasUnsavedChanges(true);
      //           }}
      //         >
      //           <option className="bg-gray-900 text-white" value="None">None</option>
      //           <option className="bg-gray-900 text-white" value="ClusterIP">ClusterIP</option>
      //           <option className="bg-gray-900 text-white" value="NodePort">NodePort</option>
      //           <option className="bg-gray-900 text-white" value="LoadBalancer">LoadBalancer</option>
      //         </select>
      //       </div>
      //       <div className="mb-4">
      //         <label className="block text-white">Namespace</label>
      //         <input
      //           type="text"
      //           className="w-full p-3 bg-transparent text-white border-b border-gray-400 focus:outline-none"
      //           value={formData.namespace}
      //           onChange={(e) => {
      //             setFormData({ ...formData, namespace: e.target.value });
      //             setHasUnsavedChanges(true);
      //           }}
      //         />
      //       </div>
      //       {/* Advanced Options Section */}
      //       {showAdvancedOptions && (
      //         <>
      //           <div className="mb-4">
      //             <label className="block text-white">CPU Requirement</label>
      //             <input
      //               type="text"
      //               className="w-full p-3 bg-transparent text-white border-b border-gray-400 focus:outline-none"
      //               value={formData.cpuRequirement}
      //               onChange={(e) => setFormData({ ...formData, cpuRequirement: e.target.value })}
      //             />
      //           </div>
      //           <div className="mb-4">
      //             <label className="block text-white">Memory Requirement</label>
      //             <input
      //               type="text"
      //               className="w-full p-3 bg-transparent text-white border-b border-gray-400 focus:outline-none"
      //               value={formData.memoryRequirement}
      //               onChange={(e) => setFormData({ ...formData, memoryRequirement: e.target.value })}
      //             />
      //           </div>
      //         </>
      //       )}
      //       {/* Buttons Section */}
      //       <div className="flex gap-4 mt-6">
      //         <button type="button" className="h-12 px-5 bg-gray-600 text-gray-400 rounded">
      //           Deploy
      //         </button>
      //         <button type="button" className="h-12 px-5 text-blue-400 rounded">
      //           Preview
      //         </button>
      //         <button type="button" className="h-12 px-5 text-blue-400 rounded" onClick={onCancel}>
      //           Cancel
      //         </button>
      //         <button
      //           type="button"
      //           className="text-blue-400"
      //           onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
      //         >
      //           {showAdvancedOptions ? "Hide Advanced Options" : "Show Advanced Options"}
      //         </button>
      //       </div>
      //     </form>
      //   </div>
      // )}

//     </div>
//   );
// };

// export default CreateOptions;




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

  const [formData, setFormData] = useState({
    appName: "",
    containerImage: "",
    numberOfPods: 1,
    service: "None",
    namespace: "",
    cpuRequirement: "",
    memoryRequirement: "",
    runCommand: "",
    runCommandArgs: "",
    key: "",
    value: "",
  });

  const handleFileUpload = () => {
    if (!selectedFile) {
      alert("Please select a file first.");
      return;
    }
    alert(`Uploading file: ${selectedFile.name}`);
  };

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
            className={`p-4 text-white ${
              activeOption === option
                ? "border-b-4 border-blue-500"
                : "border-b-4 border-transparent"
            }`}
            onClick={() => setActiveOption(option)}
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

          <div className="mt-6">
            <Editor
              height="350px"
              language={fileType}
              value={fileType === 'yaml' ? '# Enter your YAML here' : '{\n  \n}'}
              options={{ fontSize: 14, lineNumbers: "on", automaticLayout: true, minimap: { enabled: false } }}
              theme="vs-dark"
              className="rounded-md"
            />
          </div>

          <div className="flex gap-6 mt-8">
            <button className="h-10 px-4 bg-gray-600 text-gray-400 rounded" onClick={handleFileUpload}>
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

          {/* Label for File Upload */}
          <label htmlFor="file-upload" className="block w-full text-white cursor-pointer mt-7 py-2 border-b border-white">
            Choose YAML or JSON file
          </label>

          {/* Hidden File Input */}
          <input
            id="file-upload"
            type="file"
            accept=".yaml,.yml,.json"
            className="hidden"
            onChange={(e) => {
              setSelectedFile(e.target.files?.[0] || null);
              setHasUnsavedChanges(true);
            }}
          />

          {/* Buttons Section */}
          <div className="flex gap-4 mt-6">
            <button className="h-10 px-4 bg-gray-600 text-gray-400 rounded" onClick={handleFileUpload}>
              Upload
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
            <div className="mb-4">
              <label className="block text-white">App Name</label>
              <input
                type="text"
                className="w-full p-3 bg-transparent text-white border-b border-gray-400 focus:outline-none"
                value={formData.appName}
                onChange={(e) => {
                  setFormData({ ...formData, appName: e.target.value });
                  setHasUnsavedChanges(true);
                }}
              />
            </div>
            <div className="mb-4">
              <label className="block text-white">Container Image</label>
              <input
                type="text"
                className="w-full p-3 bg-transparent text-white border-b border-gray-400 focus:outline-none"
                value={formData.containerImage}
                onChange={(e) => {
                  setFormData({ ...formData, containerImage: e.target.value });
                  setHasUnsavedChanges(true);
                }}
              />
            </div>
            <div className="mb-4">
              <label className="block text-white">Number of Pods</label>
              <input
                type="number"
                className="w-full p-3 bg-transparent text-white border-b border-gray-400 focus:outline-none"
                value={formData.numberOfPods}
                onChange={(e) => {
                  setFormData({ ...formData, numberOfPods: +e.target.value });
                  setHasUnsavedChanges(true);
                }}
              />
            </div>
            <div className="mb-4">
              <label className="block text-white">Service Type</label>
              <select
                className="w-full p-3 bg-gray-900 text-white border-b border-gray-400 focus:outline-none appearance-none"
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
            <div className="mb-4">
              <label className="block text-white">Namespace</label>
              <input
                type="text"
                className="w-full p-3 bg-transparent text-white border-b border-gray-400 focus:outline-none"
                value={formData.namespace}
                onChange={(e) => {
                  setFormData({ ...formData, namespace: e.target.value });
                  setHasUnsavedChanges(true);
                }}
              />
            </div>
            {/* Advanced Options Section */}
            {showAdvancedOptions && (
              <>
                <div className="mb-4">
                  <label className="block text-white">CPU Requirement</label>
                  <input
                    type="text"
                    className="w-full p-3 bg-transparent text-white border-b border-gray-400 focus:outline-none"
                    value={formData.cpuRequirement}
                    onChange={(e) => setFormData({ ...formData, cpuRequirement: e.target.value })}
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-white">Memory Requirement</label>
                  <input
                    type="text"
                    className="w-full p-3 bg-transparent text-white border-b border-gray-400 focus:outline-none"
                    value={formData.memoryRequirement}
                    onChange={(e) => setFormData({ ...formData, memoryRequirement: e.target.value })}
                  />
                </div>
              </>
            )}
            {/* Buttons Section */}
            <div className="flex gap-4 mt-6">
              <button type="button" className="h-12 px-5 bg-gray-600 text-gray-400 rounded">
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
