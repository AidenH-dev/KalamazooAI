import React, { useState, useRef } from 'react';
import { MdOutlineFileUpload } from "react-icons/md";
import { LuArrowBigRightDash } from "react-icons/lu";
import mammoth from "mammoth";

const initialPrompts = {
  "Financial Aid": "You are a financial aid expert. Please provide guidance on financial aid applications and scholarships.",
  "Study Abroad": "You are a study abroad advisor. Provide insights and advice on international education, visa processes, and cultural adjustment.",
  "Lease Agreements": "You are an expert on lease agreements. Provide clear legal insights and guidance for rental contracts and tenant rights."
};

const Chatbot = () => {
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [documentContent, setDocumentContent] = useState(null);
  const [docType, setDocType] = useState("Financial Aid");
  const fileInputRef = useRef(null);

  // Helper to reinitialize chat with a new system prompt based on document type
  const handleDocTypeChange = (newType) => {
    setDocType(newType);
    // Reset chat history with a new system prompt (this remains locally)
    setChatHistory([{ role: 'system', content: initialPrompts[newType] }]);
    setMessage('');
    setDocumentContent(null);
    setUploadedFile(null);
  };

  // Handle file selection from the hidden file input
  const handleFileChange = async (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      let extractedText = '';

      // Handle plain text files
      if (
        file.type.startsWith("text/") ||
        /\.(txt|md|json)$/i.test(file.name)
      ) {
        const reader = new FileReader();
        reader.onload = (event) => {
          extractedText = event.target.result;
          console.log("Extracted Text:", extractedText);
          setDocumentContent(extractedText);
        };
        reader.readAsText(file);
      } else if (file.type === "application/pdf") {
        try {
          extractedText = await extractTextFromPDFViaAPI(file);
          console.log("Extracted PDF Text:", extractedText);
          setDocumentContent(extractedText);
        } catch (error) {
          console.error("Error extracting PDF text:", error);
          alert("Failed to extract text from PDF.");
        }
      } else if (
        file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        file.type === "application/msword" ||
        /\.docx?$/i.test(file.name)
      ) {
        try {
          extractedText = await extractTextFromDocx(file);
          console.log("Extracted DOCX Text:", extractedText);
          setDocumentContent(extractedText);
        } catch (error) {
          console.error("Error extracting Word document text:", error);
          alert("Failed to extract text from the Word document.");
        }
      } else {
        alert("File type not supported. Please upload a text, PDF, or Word document.");
        return;
      }
      setUploadedFile(file);
    }
  };

  // Handle sending the chat message (and file, if one was selected)
  const handleSend = async (e) => {
    e.preventDefault();
    if (!message.trim() && !uploadedFile) return;

    let docContent = documentContent;

    if (uploadedFile) {
      setUploadLoading(true);
      const formData = new FormData();
      formData.append('document', uploadedFile);
      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const uploadData = await uploadResponse.json();
      docContent = uploadData.content;
      setDocumentContent(docContent);
      setUploadedFile(null);
      setUploadLoading(false);
    }

    const userMessage = message.trim()
      ? message.trim()
      : docContent
        ? `Uploaded Document: ${docContent}`
        : '';

    const newMessage = { role: 'user', content: userMessage };
    const updatedChat = [...chatHistory, newMessage];
    setChatHistory(updatedChat);
    setMessage('');

    setLoading(true);

    // Prepare the chat payload by filtering out "system" messages and mapping "ai" to "model"
    const chatForAPI = updatedChat
      .filter(msg => msg.role !== 'system')
      .map(msg => msg.role === 'ai' ? { ...msg, role: 'model' } : msg);

    const response = await fetch('/api/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat: chatForAPI,
        document: docContent
      }),
    });

    const data = await response.json();

    if (data && data.reply) {
      // Append the API response using a local role of "ai"
      setChatHistory([...updatedChat, { role: 'ai', content: data.reply }]);
    } else {
      setChatHistory([...updatedChat, { role: 'ai', content: "Sorry, I couldn't generate a response." }]);
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#e7dece] text-[#000000] flex flex-col items-center justify-center p-8">
      <h1 className="flex items-center text-5xl font-bold mb-6">
        <img
          src="https://www.kzoo.edu/images/icons/KHornet.svg"
          alt="KHornet"
          className="w-10 h-10 mr-2"
        />
        <span style={{ fontFamily: 'Chapaza Regular' }}>
          Kalamazoo Lightyear AI
        </span>
      </h1>

      {/* Mini Horizontal Button Dashboard */}
      <div className="flex space-x-4 mb-6">
        <button
          onClick={() => handleDocTypeChange("Financial Aid")}
          className={`px-4 py-2 rounded-full text-sm transition-colors ${
            docType === "Financial Aid"
              ? "bg-[#EA681F] text-white"
              : "bg-[#FBFBFB] text-[#000000] border border-[#EEEEEE]"
          }`}
        >
          Financial Aid
        </button>
        <button
          onClick={() => handleDocTypeChange("Study Abroad")}
          className={`px-4 py-2 rounded-full text-sm transition-colors ${
            docType === "Study Abroad"
              ? "bg-[#EA681F] text-white"
              : "bg-[#FBFBFB] text-[#000000] border border-[#EEEEEE]"
          }`}
        >
          Study Abroad
        </button>
        <button
          onClick={() => handleDocTypeChange("Lease Agreements")}
          className={`px-4 py-2 rounded-full text-sm transition-colors ${
            docType === "Lease Agreements"
              ? "bg-[#EA681F] text-white"
              : "bg-[#FBFBFB] text-[#000000] border border-[#EEEEEE]"
          }`}
        >
          Lease Agreements
        </button>
      </div>

      {/* Chat Window */}
      <div className="w-full max-w-3xl bg-[#EEEEEE] rounded-lg p-4 mb-4 overflow-y-auto h-96 flex flex-col">
        {chatHistory.map((msg, index) => (
          <div
            key={index}
            className={`mb-4 p-3 rounded-lg max-w-[75%] ${
              msg.role === 'user'
                ? 'bg-[#EA681F] text-white self-end text-right'
                : 'bg-[#FBFBFB] text-[#000000] self-start text-left'
            }`}
          >
            <strong>
              {msg.role === 'user'
                ? 'You'
                : msg.role === 'system'
                  ? 'System'
                  : 'AI'}
              :
            </strong> {msg.content}
          </div>
        ))}
        {loading && (
          <div className="mb-4 p-3 rounded-lg bg-[#FBFBFB] text-[#000000] self-start">
            AI is typing...
          </div>
        )}
      </div>

      {/* Message Bar */}
      <form onSubmit={handleSend} className="w-full max-w-3xl flex items-center">
        <div className="relative flex-1">
          <input
            type="text"
            className="w-full p-3 pl-16 pr-3 bg-[#EEEEEE] rounded-full focus:outline-none focus:ring-2 focus:ring-[#EA681F] text-[#000000] placeholder:text-[#717171]"
            placeholder="Type a message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current.click()}
            className="absolute left-1.5 top-1/2 transform -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-[#FBFBFB] hover:bg-transparent hover:border-2 hover:border-[#EA681F] transition-colors duration-200"
          >
            <MdOutlineFileUpload className="text-2xl" />
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".txt,.md,.json,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.doc,.docx"
            className="hidden"
          />
        </div>
        <button
          type="submit"
          disabled={loading || uploadLoading}
          className="text-[#EEEEEE] ml-2 bg-[#EA681F] hover:bg-[#cf5c1a] transition-colors transition-transform duration-200 p-2 rounded-full transform active:scale-95"
        >
          <LuArrowBigRightDash className="text-3xl" />
        </button>
      </form>
    </div>
  );
};

export default Chatbot;
